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

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
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

      res.once('finish', onFinish);
      res.once('close', onClose);
      res.once('error', onError);

      // Redirigir el request a NestJS (Express)
      try {
        expressApp(req, res);
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
