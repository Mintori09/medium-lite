import { NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module.js';
import { setupSwagger } from './common/configs/swagger.config.js';
import { env } from './common/configs/env.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ZodValidationPipe());
  app.enableShutdownHooks();
  setupSwagger(app);

  const port = Number(env.PORT);
  await app.listen(port);
  console.log(`Server running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api`);
}

await bootstrap();
