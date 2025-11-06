import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

export async function createApp() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:3000';
  const nodeEnv = configService.get('NODE_ENV') || 'development';
  const allowedOrigins = configService.get('ALLOWED_ORIGINS');

  // Enable CORS
  let corsOrigin: string | boolean | string[] = true;
  
  if (nodeEnv === 'production') {
    // En producción, usar FRONTEND_URL o ALLOWED_ORIGINS
    if (allowedOrigins) {
      corsOrigin = allowedOrigins.split(',').map(origin => origin.trim());
    } else if (frontendUrl) {
      corsOrigin = frontendUrl;
    } else {
      // Si no hay configuración, permitir todos los orígenes en producción (temporal)
      // TODO: Configurar FRONTEND_URL o ALLOWED_ORIGINS en Vercel
      corsOrigin = true;
      console.warn('⚠️ No FRONTEND_URL or ALLOWED_ORIGINS configured, allowing all origins');
    }
  } else {
    // En desarrollo, permitir localhost y otros orígenes comunes
    corsOrigin = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];
    if (allowedOrigins) {
      const additionalOrigins = allowedOrigins.split(',').map(origin => origin.trim());
      corsOrigin = [...(corsOrigin as string[]), ...additionalOrigins];
    }
  }

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Ninja Energy Quest API')
    .setDescription('API documentation for Ninja Energy Quest game')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  return app;
}

// Solo ejecuta el servidor localmente (NO en Vercel)
if (!process.env.VERCEL) {
  createApp().then(async (app) => {
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 Ninja Energy Quest API running on http://localhost:${port}/api`);
    console.log(`📚 Swagger docs on http://localhost:${port}/api-docs`);
  });
}
