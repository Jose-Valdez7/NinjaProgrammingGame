import { VercelRequest, VercelResponse } from '@vercel/node';
import * as path from 'path';
import * as fs from 'fs';

// Importar desde el código compilado
// En Vercel, el código está compilado en dist/
let createApp: any;

// Determinar la ruta base según donde se ejecute
const cwd = process.cwd();
const isBackendGameRoot = cwd.endsWith('BackendGame') || fs.existsSync(path.join(cwd, 'api', 'index.ts'));
const basePath = isBackendGameRoot ? '.' : 'BackendGame';

console.log('📁 Current working directory:', cwd);
console.log('📁 Base path for imports:', basePath);

try {
  // Intentar importar desde dist (producción/compilado)
  const distPath = path.join(basePath, 'dist', 'main');
  console.log('🔍 Trying to import from:', distPath);
  createApp = require(distPath).createApp;
  console.log('✅ Successfully imported createApp from dist');
} catch (distError: any) {
  console.warn('⚠️ Failed to import from dist:', distError.message);
  try {
    // Si no existe dist, importar desde src (desarrollo)
    const srcPath = path.join(basePath, 'src', 'main');
    console.log('🔍 Trying to import from:', srcPath);
    createApp = require(srcPath).createApp;
    console.log('✅ Successfully imported createApp from src');
  } catch (srcError: any) {
    console.error('❌ Failed to import createApp from both dist and src');
    console.error('Dist error:', distError.message);
    console.error('Src error:', srcError.message);
    throw new Error(`Cannot import createApp: ${srcError.message}`);
  }
}

if (!createApp) {
  throw new Error('createApp function is undefined after import');
}

let cachedApp: any;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

// Este handler es el que Vercel ejecuta en cada request
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Inicializar la app solo una vez (cached) con protección contra inicializaciones concurrentes
    if (!cachedApp && !isInitializing) {
      isInitializing = true;
      console.log('🚀 Initializing NestJS app for Vercel...');
      console.log('Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Missing',
        JWT_SECRET: process.env.JWT_SECRET ? '✅ Set' : '❌ Missing',
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ? '✅ Set' : '❌ Missing',
      });
      
      initPromise = createApp()
        .then((app) => {
          cachedApp = app;
          isInitializing = false;
          console.log('✅ NestJS app initialized successfully');
          return app;
        })
        .catch((err) => {
          isInitializing = false;
          console.error('❌ Failed to initialize NestJS app:', err);
          throw err;
        });
    }

    // Esperar a que la inicialización termine si está en progreso
    if (initPromise) {
      await initPromise;
    }

    if (!cachedApp) {
      throw new Error('Failed to initialize NestJS application');
    }

    // Obtener la instancia de Express de NestJS
    const expressApp = cachedApp.getHttpAdapter().getInstance();
    
    // Pasar el request y response directamente a Express
    expressApp(req, res);
  } catch (err: any) {
    console.error('❌ Error in serverless function:', err);
    console.error('Error message:', err?.message);
    console.error('Error stack:', err?.stack);
    
    // Si la respuesta no ha sido enviada, enviar error
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Internal server error', 
        error: err?.message || 'Unknown error',
        ...(process.env.NODE_ENV === 'development' && { 
          stack: err?.stack,
          details: err
        })
      });
    }
  }
}
