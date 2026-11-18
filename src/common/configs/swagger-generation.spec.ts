import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from '../../app.module.js';
import { createSwaggerDocumentBuilder } from './swagger.config.js';

describe('Swagger OpenAPI Generation', () => {
  it('should generate valid OpenAPI specification with all error responses and i18n parameter', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    const config = createSwaggerDocumentBuilder().build();
    const rawDocument = SwaggerModule.createDocument(app, config);
    const document = cleanupOpenApiDoc(rawDocument);

    // Verify paths exist
    expect(document.paths['/auth/register']).toBeDefined();
    expect(document.paths['/auth/login']).toBeDefined();
    expect(document.paths['/auth/refresh']).toBeDefined();
    expect(document.paths['/auth/logout']).toBeDefined();
    expect(document.paths['/auth/me']).toBeDefined();

    // Verify responses on register
    const registerPost = document.paths['/auth/register'].post;
    expect(registerPost?.responses?.['201']).toBeDefined();
    expect(registerPost?.responses?.['400']).toBeDefined();
    expect(registerPost?.responses?.['409']).toBeDefined();
    expect(registerPost?.responses?.['429']).toBeDefined();

    // Verify responses on login
    const loginPost = document.paths['/auth/login'].post;
    expect(loginPost?.responses?.['200']).toBeDefined();
    expect(loginPost?.responses?.['400']).toBeDefined();
    expect(loginPost?.responses?.['401']).toBeDefined();
    expect(loginPost?.responses?.['429']).toBeDefined();

    // Verify responses on refresh
    const refreshPost = document.paths['/auth/refresh'].post;
    expect(refreshPost?.responses?.['200']).toBeDefined();
    expect(refreshPost?.responses?.['401']).toBeDefined();
    expect(refreshPost?.responses?.['429']).toBeDefined();

    // Verify responses on logout
    const logoutPost = document.paths['/auth/logout'].post;
    expect(logoutPost?.responses?.['200']).toBeDefined();
    expect(logoutPost?.responses?.['401']).toBeDefined();
    expect(logoutPost?.responses?.['429']).toBeDefined();

    // Verify responses on me
    const meGet = document.paths['/auth/me'].get;
    expect(meGet?.responses?.['200']).toBeDefined();
    expect(meGet?.responses?.['401']).toBeDefined();
    expect(meGet?.responses?.['404']).toBeDefined();
    expect(meGet?.responses?.['429']).toBeDefined();

    // Verify global accept-language header in operations
    const hasLangParam = Object.values(document.paths).some((pathItem) =>
      Object.values(pathItem).some((operation: any) =>
        operation?.parameters?.some(
          (p: { name: string; in: string }) =>
            p.name === 'accept-language' && p.in === 'header',
        ),
      ),
    );
    expect(hasLangParam).toBe(true);

    await app.close();
  });
});
