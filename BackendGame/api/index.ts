import { VercelRequest, VercelResponse } from '@vercel/node';

// Función para importar createApp de forma lazy
function getCreateApp() {
  try {
    // En producción, el código está compilado en dist/
    return require('../dist/main').createApp;
  } catch (distError: any) {
    console.warn('⚠️ Failed to import from dist, trying src:', distError.message);
    try {
      // Fallback a src en desarrollo
      return require('../src/main').createApp;
    } catch (srcError: any) {
      console.error('❌ Failed to import createApp from both dist and src');
      console.error('Dist error:', distError.message);
      console.error('Src error:', srcError.message);
      throw new Error(`Cannot import createApp: ${srcError.message}`);
    }
  }
}

let cachedApp: any;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

// Este handler es el que Vercel ejecuta en cada request
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Log inicial para debugging
  console.log('📥 Request received:', {
    method: req.method,
    url: req.url,
    path: req.url?.split('?')[0],
  });

  try {
    // Inicializar la app solo una vez (cached) con protección contra inicializaciones concurrentes
    if (!cachedApp && !isInitializing) {
      isInitializing = true;
      console.log('🚀 Initializing NestJS app for Vercel...');
      console.log('📁 Current working directory:', process.cwd());
      console.log('📦 Node version:', process.version);
      
      // Verificar variables de entorno
      const envCheck = {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        VERCEL: process.env.VERCEL || 'not set',
        DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Missing',
        JWT_SECRET: process.env.JWT_SECRET ? '✅ Set' : '❌ Missing',
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ? '✅ Set' : '❌ Missing',
      };
      console.log('🔍 Environment check:', envCheck);
      
      // Verificar si faltan variables críticas
      const missingVars = [];
      if (!process.env.DATABASE_URL) missingVars.push('DATABASE_URL');
      if (!process.env.JWT_SECRET) missingVars.push('JWT_SECRET');
      if (!process.env.JWT_REFRESH_SECRET) missingVars.push('JWT_REFRESH_SECRET');
      
      if (missingVars.length > 0) {
        const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }
      
      // Importar createApp de forma lazy
      console.log('📦 Importing createApp...');
      let createApp;
      try {
        createApp = getCreateApp();
        if (!createApp) {
          throw new Error('createApp function is undefined after import');
        }
        console.log('✅ createApp imported successfully');
      } catch (importError: any) {
        console.error('❌ Failed to import createApp:', importError);
        throw new Error(`Failed to import createApp: ${importError.message}`);
      }
      
      initPromise = createApp()
        .then((app) => {
          cachedApp = app;
          isInitializing = false;
          console.log('✅ NestJS app initialized successfully');
          return app;
        })
        .catch((err) => {
          isInitializing = false;
          console.error('❌ Failed to initialize NestJS app');
          console.error('Error name:', err?.name);
          console.error('Error message:', err?.message);
          console.error('Error stack:', err?.stack);
          if (err?.cause) {
            console.error('Error cause:', err.cause);
          }
          throw err;
        });
    }

    // Esperar a que la inicialización termine si está en progreso
    if (initPromise) {
      console.log('⏳ Waiting for app initialization...');
      await initPromise;
      console.log('✅ App initialization complete');
    }

    if (!cachedApp) {
      throw new Error('Failed to initialize NestJS application - cachedApp is null');
    }

    // Obtener la instancia de Express de NestJS
    const expressApp = cachedApp.getHttpAdapter().getInstance();
    if (!expressApp) {
      throw new Error('Express app instance is null');
    }
    
    console.log('🔄 Passing request to Express...');
    // Pasar el request y response directamente a Express
    expressApp(req, res);
  } catch (err: any) {
    console.error('❌ Error in serverless function');
    console.error('Error type:', typeof err);
    console.error('Error name:', err?.name);
    console.error('Error message:', err?.message);
    console.error('Error stack:', err?.stack);
    if (err?.cause) {
      console.error('Error cause:', err.cause);
    }
    
    // Si la respuesta no ha sido enviada, enviar error
    if (!res.headersSent) {
      const errorResponse: any = {
        message: 'Internal server error',
        error: err?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      };
      
      // Solo incluir stack en desarrollo o si NODE_ENV no es production
      if (process.env.NODE_ENV !== 'production') {
        errorResponse.stack = err?.stack;
        errorResponse.details = {
          name: err?.name,
          cause: err?.cause,
        };
      }
      
      res.status(500).json(errorResponse);
    } else {
      console.warn('⚠️ Response already sent, cannot send error response');
    }
  }
}
