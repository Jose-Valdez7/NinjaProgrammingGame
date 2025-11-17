import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/exceptions/global-exception.filter';

export async function createApp() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:3000';
  const nodeEnv = configService.get('NODE_ENV') || 'development';
  const allowedOrigins = configService.get('ALLOWED_ORIGINS');

  // 🔹 Función para validar orígenes permitidos
  const isVercelOrigin = (origin: string | undefined): boolean => {
    if (!origin) return false;
    return (
      origin.includes('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    );
  };

  // 🔹 Configuración dinámica de CORS
  let corsOrigin: string[] | ((origin: string | undefined, callback: Function) => void);

  if (nodeEnv === 'production') {
    corsOrigin = (origin, callback) => {
      if (!origin) return callback(null, false);
      const allowed =
        isVercelOrigin(origin) ||
        origin === frontendUrl ||
        (allowedOrigins && allowedOrigins.split(',').includes(origin));
      if (allowed) callback(null, true);
      else callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    };
  } else {
    corsOrigin = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ];
  }

  // 🔹 Activar CORS globalmente
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 🔹 Pipes y filtros globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api');

  // 🔹 Middleware de logging para debugging (solo en desarrollo)
  if (process.env.REQUEST_LOGGING === 'true') {
    app.use((req, res, next) => {
      console.log(`🛰️ [${req.method}] ${req.url}`);
      next();
    });
  }

  // 🔹 Swagger
  const config = new DocumentBuilder()
    .setTitle('Ninja Energy Quest API')
    .setDescription('API documentation for Ninja Energy Quest')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  return app;
}

// 🔹 Solo iniciar servidor local (Vercel no ejecuta esto)
if (!process.env.VERCEL) {
  createApp().then(async (app) => {
    const port = process.env.PORT || 3001;
    await app.listen(port);
  });
}
