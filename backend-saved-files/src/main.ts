import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const log = new Logger('Arranque');

  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  if (/^cambiar/i.test(process.env.JWT_SECRET ?? '')) {
    new Logger('Seguridad').warn('JWT_SECRET conserva el valor de ejemplo: cámbialo por un secreto largo y aleatorio en el .env.');
  }

  // Modo "un solo programa": si el frontend está compilado, el backend lo sirve en el mismo puerto.
  const dirFrontend = resolve(process.env.FRONTEND_DIR ?? join(process.cwd(), '..', 'frontend-saved-files', 'dist'));
  if (existsSync(join(dirFrontend, 'index.html'))) {
    app.useStaticAssets(dirFrontend);
    // Cualquier ruta GET que no sea de la API devuelve la app (vue-router resuelve la ruta en el navegador).
    app.use((req: Request, res: Response, next: NextFunction) =>
      req.method === 'GET' && !req.path.startsWith('/api') ? res.sendFile(join(dirFrontend, 'index.html')) : next(),
    );
    log.log(`Sirviendo el frontend desde ${dirFrontend}`);
  } else {
    log.warn(`No se encontró el frontend compilado en ${dirFrontend} (ejecuta "npm run build" en frontend-saved-files).`);
  }

  const puerto = Number(process.env.PORT ?? 3000);
  await app.listen(puerto);
  log.log(`Aplicación disponible en el puerto ${puerto}`);
}
await bootstrap();
