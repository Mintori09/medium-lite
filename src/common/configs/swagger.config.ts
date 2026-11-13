import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { env } from './env.config.js';

export function setupSwagger(app: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle(env.SWAGGER_DOC_TITLE)
    .setDescription(env.SWAGGER_DOC_DESCRIPTION)
    .setVersion(env.SWAGGER_DOC_VERSION)
    .addTag('Hello', 'Hello World & Greetings endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: env.SWAGGER_SITE_TITLE,
  });
}
