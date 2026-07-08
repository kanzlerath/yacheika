import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const trustProxy = process.env.TRUST_PROXY;

  if (trustProxy && !['false', '0', 'off'].includes(trustProxy.toLowerCase())) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxy === 'true' ? true : trustProxy);
  }

  // Enable CORS for dev convenience
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: false,
    }),
  );

  // Increase payload limits for gallery image uploads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  const port = process.env.PORT || 4002;
  await app.listen(port, '0.0.0.0');
  
  logger.log(`[Ячейка NestJS Backend] Server running on http://0.0.0.0:${port}`);
}
bootstrap();
