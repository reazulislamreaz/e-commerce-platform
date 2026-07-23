import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { PRODUCT_UPLOADS_URL_PREFIX, resolveProductUploadDir } from './config/uploads';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  app.useLogger(app.get(Logger));
  // Flush in-flight requests and close Redis/Prisma/BullMQ connections on
  // SIGTERM/SIGINT (rolling deploys) instead of dropping them mid-flight.
  app.enableShutdownHooks();
  // Behind a reverse proxy (nginx) the client IP arrives via X-Forwarded-For;
  // trust the first hop so rate limiting keys on the real client, not the proxy.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({ origin: config.getOrThrow('FRONTEND_ORIGIN'), credentials: true });
  app.useStaticAssets(resolveProductUploadDir(config), {
    prefix: PRODUCT_UPLOADS_URL_PREFIX,
    index: false,
    dotfiles: 'ignore',
    fallthrough: true,
    maxAge: '7d',
    immutable: true,
    setHeaders: (res) => {
      // Allow the cross-origin frontend to embed images; block MIME sniffing.
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'docs', method: RequestMethod.ALL },
      { path: 'docs/{*path}', method: RequestMethod.ALL },
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // Keep the interactive API surface (DTO shapes, auth scheme) off public
  // production hosts unless explicitly opted in via ENABLE_SWAGGER=true.
  const swaggerEnabled =
    config.get<string>('NODE_ENV') !== 'production' ||
    config.get<string>('ENABLE_SWAGGER') === 'true';
  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('E-commerce API')
        .setDescription(
          'Elevate Apparel REST API. Successful responses are wrapped as ' +
            '`{ success, message, data, meta? }`; errors as `{ success: false, message, error, statusCode, path, timestamp }`.',
        )
        .setVersion('1.0')
        .addBearerAuth()
        .addCookieAuth('refresh_token', {
          type: 'apiKey',
          in: 'cookie',
          description: 'HTTP-only rotating refresh token set by /auth/login',
        })
        .build(),
    );
    SwaggerModule.setup('docs', app, document);
  }
  await app.listen(config.getOrThrow<number>('PORT'));
}

void bootstrap();
