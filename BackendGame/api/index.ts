import { createApp } from '../src/main';
import { VercelRequest, VercelResponse } from '@vercel/node';

let cachedApp: any;

// Este handler es el que Vercel ejecuta en cada request
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!cachedApp) {
      const app = await createApp();
      await app.init();
      cachedApp = app;
    }

    // Enrutamiento del framework NestJS
    cachedApp.getHttpAdapter().getInstance()(req, res);
  } catch (err) {
    console.error('❌ Error in serverless function:', err);
    res.status(500).json({ message: 'Internal server error', error: err?.message });
  }
}
