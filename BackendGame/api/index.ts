import type { INestApplication } from '@nestjs/common';
import { Request, Response } from 'express';
import { createApp } from '../src/main';

let cachedApp: INestApplication | null = null;

// Este handler lo ejecuta Vercel en cada request
export default async function handler(req: Request, res: Response) {
  try {
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

    // Redirigir el request a NestJS (Express)
    return expressApp(req, res);
  } catch (err: any) {
    console.error('❌ Error en serverless handler:', err);
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Internal Server Error',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }
  }
}
