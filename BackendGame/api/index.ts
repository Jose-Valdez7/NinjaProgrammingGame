import type { INestApplication } from '@nestjs/common';
import { Request, Response } from 'express';
import { createApp } from '../src/main';

let cachedApp: INestApplication | null = null;

// Este handler lo ejecuta Vercel en cada request
export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    console.log(`📥 Request recibido: ${req.method} ${req.url}`);
    
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

      // Redirigir el request a NestJS (Express)
      // No usar callback, dejar que Express maneje la respuesta directamente
      try {
        expressApp(req, res);
        
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
          if (res.headersSent || res.finished) {
            console.log(`✅ Response completada (polling, intento ${pollCount}): ${req.method} ${req.url} - Status: ${res.statusCode}`);
            cleanup();
            resolve();
            return;
          }
          
          // Si alcanzamos el máximo de polls, el timeout se encargará
          if (pollCount >= maxPolls) {
            if (pollInterval) clearInterval(pollInterval);
          }
        }, 50); // Verificar cada 50ms
        
        // También verificar inmediatamente
        setImmediate(() => {
          if (!resolved && (res.headersSent || res.finished)) {
            console.log(`✅ Response ya completada (verificación inmediata): ${req.method} ${req.url}`);
            if (pollInterval) clearInterval(pollInterval);
            cleanup();
            resolve();
          }
        });
      } catch (err: any) {
        cleanup();
        console.error('❌ Error ejecutando Express app:', err);
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
