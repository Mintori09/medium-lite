import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Hello World API')
    .setDescription(
      'NestJS Starter API with Swagger documentation and i18n support',
    )
    .setVersion('1.0.0')
    .addTag('Hello', 'Hello World & Greetings endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'NestJS API Docs',
  });
}
