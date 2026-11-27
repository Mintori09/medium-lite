import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createE2EApp } from './helpers/e2e-app.helper.js';
import { getI18n } from './helpers/i18n-test.helper.js';

describe('i18n Resolvers & Translations (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2EApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Validation Errors Translation', () => {
    it('translates validation errors to Vietnamese via Accept-Language header', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Accept-Language', 'vi')
        .send({
          email: 'invalid-email',
          username: 'ab',
          password: '123',
        })
        .expect(400);

      expect(res.body.message).toContain(
        getI18n('vi', 'validation.INVALID_EMAIL'),
      );
      expect(res.body.message).toContain(
        getI18n('vi', 'validation.TOO_SHORT', {
          field: 'username',
          minimum: 3,
        }),
      );
      expect(res.body.message).toContain(
        getI18n('vi', 'validation.TOO_SHORT', {
          field: 'password',
          minimum: 12,
        }),
      );
    });

    it('translates validation errors to Vietnamese via x-custom-lang header', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .set('x-custom-lang', 'vi')
        .send({
          email: 'not-an-email',
        })
        .expect(400);

      expect(res.body.message).toContain(
        getI18n('vi', 'validation.INVALID_EMAIL'),
      );
      expect(res.body.message).toContain(
        getI18n('vi', 'validation.REQUIRED', { field: 'username' }),
      );
    });

    it('translates validation errors to Vietnamese via query parameter ?lang=vi', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register?lang=vi')
        .send({})
        .expect(400);

      expect(res.body.message).toContain(
        getI18n('vi', 'validation.REQUIRED', { field: 'email' }),
      );
      expect(res.body.message).toContain(
        getI18n('vi', 'validation.REQUIRED', { field: 'username' }),
      );
      expect(res.body.message).toContain(
        getI18n('vi', 'validation.REQUIRED', { field: 'password' }),
      );
    });

    it('falls back to English when an unsupported language is requested', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Accept-Language', 'fr-FR,fr;q=0.9')
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      expect(res.body.message).toContain(
        getI18n('en', 'validation.INVALID_EMAIL'),
      );
      expect(res.body.message).toContain(
        getI18n('en', 'validation.REQUIRED', { field: 'username' }),
      );
    });
  });

  describe('Authentication Guard Exceptions Translation', () => {
    it('returns Vietnamese error message when token is missing and Accept-Language is vi', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Accept-Language', 'vi')
        .expect(401);

      expect(res.body.message).toBe(getI18n('vi', 'auth.TOKEN_MISSING'));
    });

    it('returns English fallback error message when token is missing and header is en or missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);

      expect(res.body.message).toBe(getI18n('en', 'auth.TOKEN_MISSING'));
    });

    it('returns Vietnamese error message via query parameter ?lang=vi', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me?lang=vi')
        .expect(401);

      expect(res.body.message).toBe(getI18n('vi', 'auth.TOKEN_MISSING'));
    });
  });
});
