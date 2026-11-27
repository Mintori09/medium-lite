import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { env } from '../src/common/configs/env.config.js';
import { cleanupTestUploads } from './helpers/db-test.helper.js';

const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52,
]);

describe('Users & Profiles (e2e)', () => {
  let app: NestExpressApplication;
  const uniqueId = Date.now();

  const userA = {
    email: `usera_${uniqueId}@example.com`,
    username: `usera_${uniqueId}`,
    password: 'Password1234!',
    bio: 'Initial bio A',
  };

  const userB = {
    email: `userb_${uniqueId}@example.com`,
    username: `userb_${uniqueId}`,
    password: 'Password1234!',
    bio: 'Initial bio B',
  };

  let tokenA = '';
  let uploadedAvatarUrl = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.use(cookieParser());
    app.useStaticAssets(path.resolve(env.UPLOAD_DIR), {
      prefix: env.PUBLIC_SERVE_ROOT,
    });
    await app.init();

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(userA)
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(userB)
      .expect(201);

    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userA.email, password: userA.password })
      .expect(200);
    tokenA = (loginA.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    try {
      if (app) {
        await app.close();
      }
    } finally {
      await cleanupTestUploads();
    }
  });

  describe('PATCH /users/me', () => {
    it('should update bio and return wrapped { user } without passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ bio: 'Updated bio A' })
        .expect(200);

      const body = res.body as { user: Record<string, unknown> };
      expect(body.user).toBeDefined();
      expect(body.user.bio).toBe('Updated bio A');
      expect(body.user.passwordHash).toBeUndefined();
    });

    it('should clear bio to null when sending empty string', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ bio: '' })
        .expect(200);

      const body = res.body as { user: Record<string, unknown> };
      expect(body.user.bio).toBeNull();
    });

    it('should reject whitespace-only password', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ password: '            ' })
        .expect(400);
    });

    it('should reject duplicate email with 409', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ email: userB.email })
        .expect(409);
    });

    it('should reject spoofed HTML file with image/png Content-Type (Stored XSS)', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach(
          'avatar',
          Buffer.from('<html><script>alert(1)</script></html>'),
          {
            filename: 'avatar.html',
            contentType: 'image/png',
          },
        )
        .expect(400);
    });

    it('should upload valid PNG avatar and serve it publicly', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .field('bio', 'Bio with avatar')
        .attach('avatar', VALID_PNG_BUFFER, {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(200);

      const body = res.body as { user: { image: string; bio: string } };
      expect(body.user.bio).toBe('Bio with avatar');
      expect(body.user.image).toMatch(/^\/public\/uploads\/avatars\/.+\.png$/);
      uploadedAvatarUrl = body.user.image;

      await request(app.getHttpServer()).get(uploadedAvatarUrl).expect(200);
    });

    it('should clear avatar to null when sending image=""', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ image: '' })
        .expect(200);

      const body = res.body as { user: { image: string | null } };
      expect(body.user.image).toBeNull();

      await request(app.getHttpServer()).get(uploadedAvatarUrl).expect(404);
    });

    it('should require currentPassword when changing password and verify old/new login', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ password: 'NewPassword123!' })
        .expect(400);

      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          currentPassword: 'WrongPassword123!',
          password: 'NewPassword123!',
        })
        .expect(401);

      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          currentPassword: userA.password,
          password: 'NewPassword123!',
        })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userA.email, password: userA.password })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userA.email, password: 'NewPassword123!' })
        .expect(200);
    });

    it('should reject duplicate username (409) and invalid image URL (400)', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ username: userB.username })
        .expect(409);

      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ image: 'not-a-valid-url' })
        .expect(400);
    });
  });
});
