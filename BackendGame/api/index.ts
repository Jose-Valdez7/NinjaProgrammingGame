import type { INestApplication } from '@nestjs/common';
import { Request, Response } from 'express';
import * as express from 'express';
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
        console.log(`🔄 Request body:`, req.body ? JSON.stringify(req.body).substring(0, 200) : 'empty');
        console.log(`🔄 Request headers:`, {
          'content-type': req.headers['content-type'],
          'origin': req.headers.origin,
        });
        
        // Obtener tanto el HTTP Server como la aplicación Express
        // En Vercel, necesitamos usar el HTTP Server para emitir el evento 'request'
        const httpAdapter = cachedApp.getHttpAdapter();
        const expressApp = httpAdapter.getInstance();
        const httpServer = cachedApp.getHttpServer();
        
        console.log(`🔍 Express app obtenida, tipo: ${typeof expressApp}`);
        console.log(`🔍 HTTP Server obtenido, tipo: ${typeof httpServer}`);
        console.log(`🔍 Express app es función: ${typeof expressApp === 'function'}`);
        
        // Verificar que tengamos la aplicación Express
        if (typeof expressApp !== 'function') {
          console.error('❌ Express app no es una función! Tipo:', typeof expressApp);
          res.status(500).json({ 
            error: 'Express instance invalid',
            message: 'La instancia de Express no es una función'
          });
          resolve();
          return;
        }
        
        // Pasar el request directamente a Express de NestJS
        // En Vercel, necesitamos asegurarnos de que el request se procese correctamente
        try {
          console.log('📤 Pasando request a Express de NestJS...');
          console.log('📤 Request details:', {
            method: req.method,
            url: req.url,
            path: (req as any).path,
            originalUrl: (req as any).originalUrl,
            hasBody: !!req.body,
            bodyKeys: req.body ? Object.keys(req.body) : [],
            headers: {
              'content-type': req.headers['content-type'],
              'content-length': req.headers['content-length'],
            }
          });
          
          // Verificar que Express tenga el método correcto (ya verificado arriba, pero por seguridad)
          if (typeof expressApp !== 'function') {
            console.error('❌ Express app no es una función:', typeof expressApp);
            res.status(500).json({ error: 'Express app invalid' });
            resolve();
            return;
          }
          
          // Asegurar que el request tenga las propiedades necesarias para Express
          // En Vercel, estas propiedades pueden no estar establecidas
          let requestUrl = req.url || '';
          
          // Si la URL ya incluye /api, no duplicar (NestJS ya tiene el prefijo global /api)
          // Pero si viene como /api/auth/login, necesitamos mantenerlo así
          if (!(req as any).path) {
            (req as any).path = requestUrl.split('?')[0] || requestUrl;
          }
          if (!(req as any).originalUrl) {
            (req as any).originalUrl = requestUrl;
          }
          if (!(req as any).baseUrl) {
            (req as any).baseUrl = '';
          }
          
          // Asegurar que req.url esté establecido correctamente
          if (!req.url) {
            req.url = requestUrl;
          }
          
          console.log('📤 Request preparado para Express:', {
            url: req.url,
            path: (req as any).path,
            originalUrl: (req as any).originalUrl,
            baseUrl: (req as any).baseUrl,
            method: req.method,
          });
          
          // En Vercel, usar el HTTP Server para emitir el evento 'request' directamente
          // Esto es más confiable que llamar a Express directamente
          console.log('📤 Usando HTTP Server para emitir evento request...');
          
          try {
            // El HTTP Server de Node.js puede emitir eventos 'request'
            // Esto debería hacer que Express procese el request correctamente
            if (httpServer && typeof (httpServer as any).emit === 'function') {
              console.log('📤 Emitiendo evento request al HTTP Server...');
              (httpServer as any).emit('request', req, res);
              console.log('✅ Evento request emitido');
            } else {
              // Si no podemos usar el HTTP Server, usar Express directamente
              console.log('📤 HTTP Server no disponible, usando Express app directamente...');
              const expressResult = expressApp(req, res, (err?: any) => {
                if (err) {
                  console.error('❌ Error en callback de Express:', err);
                  console.error('Stack:', err.stack);
                  if (!res.headersSent) {
                    res.status(500).json({ error: err.message });
                  }
                  reject(err);
                } else {
                  console.log('✅ Express callback ejecutado');
                  if (!res.headersSent && !res.finished) {
                    console.warn('⚠️ Express callback ejecutado pero no se envió respuesta');
                  }
                }
              });
              
              if (expressResult && typeof expressResult.then === 'function') {
                expressResult.catch((err: any) => {
                  console.error('❌ Error en promesa de Express:', err);
                  reject(err);
                });
              }
            }
          } catch (expressErr: any) {
            console.error('❌ Error al procesar request:', expressErr);
            console.error('Stack:', expressErr.stack);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Error processing request', message: expressErr.message });
            }
            reject(expressErr);
            return;
          }
          
          console.log('📤 Express instance llamada');
          
          // Verificar inmediatamente si Express procesó el request
          setImmediate(() => {
            console.log('🔍 Estado después de Express:', {
              headersSent: res.headersSent,
              finished: res.finished,
              statusCode: res.statusCode,
            });
          });
          
        } catch (err: any) {
          console.error('❌ Error al pasar request a Express:', err);
          console.error('Stack:', err.stack);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error', message: err.message });
          }
          reject(err);
          return;
        }
        
        console.log(`📤 Request pasado a NestJS, esperando respuesta...`);
        
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
