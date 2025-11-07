import type { INestApplication } from '@nestjs/common';
import { Request, Response } from 'express';
import { createApp } from '../src/main';

let cachedApp: INestApplication | null = null;

// Este handler lo ejecuta Vercel en cada request
export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    console.log(`📥 Request recibido: ${req.method} ${req.url}`);
    
    // Manejar requests OPTIONS (preflight CORS) inmediatamente
    if (req.method === 'OPTIONS') {
      console.log(`🔧 Respondiendo a OPTIONS preflight: ${req.url}`);
      const origin = req.headers.origin;
      
      // Permitir cualquier origen de Vercel o localhost
      const isAllowedOrigin = !origin || 
        origin.includes('.vercel.app') || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1');
      
      if (isAllowedOrigin && origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
      
      // Responder inmediatamente y asegurar que se complete
      res.status(204).end();
      console.log(`✅ OPTIONS preflight respondido: ${req.url} - Status: 204`);
      return Promise.resolve();
    }
    
    // Inicializar NestJS solo una vez (persistente entre requests)
    if (!cachedApp) {
      console.log('🚀 Inicializando NestJS app...');
      cachedApp = await createApp();
      await cachedApp.init();
      console.log('✅ App inicializada correctamente');
    }

    // Obtener la instancia Express de NestJS
    const expressApp = cachedApp.getHttpAdapter().getInstance();
    if (!expressApp) {
      throw new Error('No se pudo obtener la instancia de Express de NestJS');
    }

    // Envolver en una promesa para asegurar que la respuesta se complete correctamente
    await new Promise<void>((resolve, reject) => {
      let resolved = false;
      let pollInterval: NodeJS.Timeout | null = null;
      
      // Timeout de seguridad (9 segundos)
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log(`⏱️ Timeout alcanzado para ${req.method} ${req.url}`);
          if (pollInterval) clearInterval(pollInterval);
          if (!res.headersSent) {
            res.status(504).json({
              message: 'Gateway Timeout',
              error: 'La respuesta tardó demasiado tiempo',
            });
          }
          resolve();
        }
      }, 9000);

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          if (pollInterval) clearInterval(pollInterval);
          res.removeListener('finish', onFinish);
          res.removeListener('close', onClose);
          res.removeListener('error', onError);
        }
      };

      const onFinish = () => {
        console.log(`✅ Response completada: ${req.method} ${req.url} - Status: ${res.statusCode}`);
        cleanup();
        resolve();
      };

      const onClose = () => {
        console.log(`⚠️ Response cerrada: ${req.method} ${req.url}`);
        cleanup();
        resolve();
      };

      const onError = (err: Error) => {
        cleanup();
        console.error('❌ Error en respuesta:', err);
        if (!res.headersSent) {
          res.status(500).json({
            message: 'Internal Server Error',
            error: err.message,
          });
        }
        reject(err);
      };

      // Registrar listeners ANTES de pasar el request a Express
      res.once('finish', onFinish);
      res.once('close', onClose);
      res.once('error', onError);

      // Redirigir el request a NestJS usando el método HTTP adapter
      // Esto es más confiable que usar Express directamente
      try {
        console.log(`🔄 Pasando request a NestJS: ${req.method} ${req.url}`);
        
        // Usar el método getHttpAdapter para obtener el handler HTTP de NestJS
        const httpAdapter = cachedApp.getHttpAdapter();
        const instance = httpAdapter.getInstance();
        
        // Agregar listener para errores no capturados
        instance.on('error', (err: Error) => {
          console.error('❌ Error en Express instance:', err);
        });
        
        // Pasar el request a Express
        instance(req, res);
        
        console.log(`📤 Request pasado a Express, esperando respuesta...`);
        
        // Polling para verificar si la respuesta se completó
        // Esto es necesario porque en Vercel los eventos pueden no dispararse correctamente
        let pollCount = 0;
        const maxPolls = 180; // 180 * 50ms = 9 segundos máximo
        pollInterval = setInterval(() => {
          pollCount++;
          
          if (resolved) {
            if (pollInterval) clearInterval(pollInterval);
            return;
          }
          
          // Verificar si la respuesta se completó
          const isComplete = res.headersSent || res.finished || res.writableEnded || !res.writable;
          
          if (isComplete) {
            console.log(`✅ Response completada (polling, intento ${pollCount}): ${req.method} ${req.url} - Status: ${res.statusCode || 'unknown'}, headersSent: ${res.headersSent}, finished: ${res.finished}`);
            cleanup();
            resolve();
            return;
          }
          
          // Log cada 20 intentos (cada segundo) para debugging
          if (pollCount % 20 === 0) {
            console.log(`⏳ Esperando respuesta... (${pollCount}/${maxPolls}): ${req.method} ${req.url} - headersSent: ${res.headersSent}, finished: ${res.finished}, writable: ${res.writable}`);
          }
          
          // Si alcanzamos el máximo de polls, el timeout se encargará
          if (pollCount >= maxPolls) {
            if (pollInterval) clearInterval(pollInterval);
          }
        }, 50); // Verificar cada 50ms
        
        // También verificar inmediatamente
        setImmediate(() => {
          if (!resolved) {
            const isComplete = res.headersSent || res.finished || res.writableEnded || !res.writable;
            if (isComplete) {
              console.log(`✅ Response ya completada (verificación inmediata): ${req.method} ${req.url} - Status: ${res.statusCode || 'unknown'}`);
              if (pollInterval) clearInterval(pollInterval);
              cleanup();
              resolve();
            }
          }
        });
      } catch (err: any) {
        cleanup();
        console.error('❌ Error ejecutando Express app:', err);
        console.error('Stack:', err.stack);
        if (!res.headersSent) {
          res.status(500).json({
            message: 'Internal Server Error',
            error: err.message,
          });
        }
        reject(err);
      }
    });
  } catch (err: any) {
    console.error('❌ Error en serverless handler:', err);
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Internal Server Error',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }
    throw err;
  }
}
