import { VercelRequest, VercelResponse } from '@vercel/node';

// Función para importar createApp de forma lazy
function getCreateApp() {
  const fs = require('fs');
  const path = require('path');
  
  // Determinar la ruta base
  const currentDir = __dirname; // /var/task/BackendGame/api
  const baseDir = path.dirname(currentDir); // /var/task/BackendGame
  
  console.log('📁 Current directory:', currentDir);
  console.log('📁 Base directory:', baseDir);
  
  // Intentar diferentes rutas posibles
  const possiblePaths = [
    path.join(baseDir, 'dist', 'main'),
    path.join(baseDir, 'BackendGame', 'dist', 'main'),
    path.join(baseDir, 'src', 'main'),
    path.join(baseDir, 'BackendGame', 'src', 'main'),
    '../dist/main',
    '../src/main',
  ];
  
  for (const tryPath of possiblePaths) {
    try {
      console.log(`🔍 Trying to import from: ${tryPath}`);
      const resolvedPath = path.isAbsolute(tryPath) ? tryPath : path.resolve(currentDir, tryPath);
      
      // Verificar si el archivo existe
      if (fs.existsSync(resolvedPath + '.js') || fs.existsSync(resolvedPath + '.ts')) {
        const module = require(tryPath);
        if (module && module.createApp) {
          console.log(`✅ Successfully imported from: ${tryPath}`);
          return module.createApp;
        }
      }
    } catch (err: any) {
      // Continuar con el siguiente path
      continue;
    }
  }
  
  // Si ninguna ruta funcionó, intentar las rutas originales y mostrar error detallado
  try {
    return require('../dist/main').createApp;
  } catch (distError: any) {
    console.warn('⚠️ Failed to import from dist:', distError.message);
    try {
      return require('../src/main').createApp;
    } catch (srcError: any) {
      console.error('❌ Failed to import createApp from all possible paths');
      console.error('Tried paths:', possiblePaths);
      console.error('Dist error:', distError.message);
      console.error('Src error:', srcError.message);
      throw new Error(`Cannot import createApp. Last error: ${srcError.message}`);
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
        // Resetear el estado de inicialización antes de lanzar el error
        isInitializing = false;
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
      
      // Crear la promesa de inicialización con timeout
      const initTimeout = 30000; // 30 segundos
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`App initialization timeout after ${initTimeout}ms`));
        }, initTimeout);
      });

      initPromise = Promise.race([
        createApp()
          .then((app) => {
            if (!app) {
              throw new Error('createApp returned null or undefined');
            }
            cachedApp = app;
            isInitializing = false;
            console.log('✅ NestJS app initialized successfully');
            console.log('App type:', typeof app);
            console.log('App has getHttpAdapter:', typeof app.getHttpAdapter === 'function');
            return app;
          })
          .catch((err) => {
            isInitializing = false;
            console.error('❌ Failed to initialize NestJS app in createApp()');
            console.error('Error name:', err?.name);
            console.error('Error message:', err?.message);
            console.error('Error stack:', err?.stack);
            if (err?.cause) {
              console.error('Error cause:', err.cause);
            }
            // Log adicional para errores de Prisma
            if (err?.message?.includes('Prisma') || err?.message?.includes('database') || err?.message?.includes('connect')) {
              console.error('🔴 Database connection error detected');
              console.error('DATABASE_URL format check:', process.env.DATABASE_URL ? 'Present' : 'Missing');
            }
            throw err;
          }),
        timeoutPromise,
      ]) as Promise<any>;
    }

    // Esperar a que la inicialización termine si está en progreso
    if (initPromise) {
      console.log('⏳ Waiting for app initialization...');
      try {
        const result = await initPromise;
        console.log('✅ App initialization promise resolved');
        console.log('Result type:', typeof result);
        console.log('Result is app:', !!result);
        
        // Verificar que cachedApp se estableció
        if (!cachedApp && result) {
          console.warn('⚠️ cachedApp is null but result exists, setting it now');
          cachedApp = result;
        }
      } catch (initError: any) {
        isInitializing = false;
        initPromise = null; // Limpiar la promesa fallida
        console.error('❌ App initialization promise rejected');
        console.error('Init error name:', initError?.name);
        console.error('Init error message:', initError?.message);
        console.error('Init error stack:', initError?.stack);
        if (initError?.cause) {
          console.error('Init error cause:', initError.cause);
        }
        // Asegurar que cachedApp esté en null si falló
        cachedApp = null;
        // Re-lanzar el error para que se capture en el catch principal
        throw initError;
      }
    } else if (isInitializing && !initPromise) {
      // Si isInitializing es true pero no hay initPromise, algo salió mal
      // Esperar un momento y reintentar
      console.warn('⚠️ isInitializing is true but no initPromise, waiting...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Si después de esperar sigue sin initPromise, resetear el estado
      if (!initPromise && !cachedApp) {
        console.error('❌ Initialization state inconsistent, resetting...');
        isInitializing = false;
        throw new Error('Initialization state inconsistent - please retry the request');
      }
    }

    if (!cachedApp) {
      // Si llegamos aquí, la inicialización falló silenciosamente
      const errorMsg = 'Failed to initialize NestJS application - cachedApp is null after initialization';
      console.error('❌', errorMsg);
      console.error('State check:', {
        cachedApp: cachedApp,
        isInitializing: isInitializing,
        hasInitPromise: !!initPromise,
      });
      // Resetear el estado para permitir reintentos
      isInitializing = false;
      initPromise = null;
      throw new Error(errorMsg);
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
      
      // En Vercel, siempre mostrar detalles del error para debugging
      // (en producción real podrías querer ocultarlos)
      errorResponse.details = {
        name: err?.name,
        type: typeof err,
      };
      
      // Incluir stack si está disponible (útil para debugging)
      if (err?.stack) {
        errorResponse.stack = err?.stack;
      }
      
      // Incluir información adicional si está disponible
      if (err?.cause) {
        errorResponse.cause = err.cause;
      }
      
      res.status(500).json(errorResponse);
    } else {
      console.warn('⚠️ Response already sent, cannot send error response');
    }
  }
}
