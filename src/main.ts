import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './common/configs/app.config.js';
import { setupSwagger } from './common/configs/swagger.config.js';
import { env } from './common/configs/env.config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  app.enableShutdownHooks();
  setupSwagger(app);

  const port = Number(env.PORT);
  await app.listen(port);
  console.log(`Server running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api`);
}

await bootstrap();
