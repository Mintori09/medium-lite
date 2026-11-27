import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { REFRESH_TOKEN_COOKIE } from '../../modules/auth/auth.constants.js';
import { env } from './env.config.js';

export function createSwaggerDocumentBuilder(): DocumentBuilder {
  return new DocumentBuilder()
    .setTitle(env.SWAGGER_DOC_TITLE)
    .setDescription(env.SWAGGER_DOC_DESCRIPTION)
    .setVersion(env.SWAGGER_DOC_VERSION)
    .addTag('Auth', 'Authentication & User endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter Access Token (Bearer)',
        in: 'header',
      },
      'bearer',
    )
    .addCookieAuth(REFRESH_TOKEN_COOKIE, undefined, REFRESH_TOKEN_COOKIE)
    .addGlobalParameters({
      name: 'accept-language',
      in: 'header',
      required: false,
      description:
        'Language preference for localized response messages (en, vi)',
      schema: {
        type: 'string',
        enum: ['en', 'vi'],
        default: 'en',
        example: 'vi',
      },
    });
}

export function setupSwagger(app: INestApplication): void {
  const swaggerConfig = createSwaggerDocumentBuilder().build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const cleanedDocument = cleanupOpenApiDoc(document);
  SwaggerModule.setup('api', app, cleanedDocument, {
    customSiteTitle: env.SWAGGER_SITE_TITLE,
  });
}
