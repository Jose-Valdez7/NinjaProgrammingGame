import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

export async function createApp() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:3000';

  // Enable CORS
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
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
