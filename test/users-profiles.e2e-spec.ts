import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { env } from '../src/common/configs/env.config.js';
import { getI18n } from './helpers/i18n-test.helper.js';

const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52,
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
  let tokenB = '';
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

    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userB.email, password: userB.password })
      .expect(200);
    tokenB = (loginB.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
    await fs.rm(path.resolve(env.UPLOAD_DIR), { recursive: true, force: true });
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
        .attach('avatar', Buffer.from('<html><script>alert(1)</script></html>'), {
          filename: 'avatar.html',
          contentType: 'image/png',
        })
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
  });

  describe('Profiles & Follow', () => {
    it('GET /profiles/:username should work anonymously with following=false', async () => {
      const res = await request(app.getHttpServer())
        .get(`/profiles/${userB.username}`)
        .expect(200);

      expect(res.body).toEqual({
        profile: {
          username: userB.username,
          bio: userB.bio,
          image: null,
          following: false,
        },
      });
    });

    it('GET /profiles/:username should return 401 when given invalid Bearer token', async () => {
      await request(app.getHttpServer())
        .get(`/profiles/${userB.username}`)
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('GET /profiles/:username should return 404 for unknown user', async () => {
      await request(app.getHttpServer())
        .get(`/profiles/nonexistent_${uniqueId}`)
        .expect(404);
    });

    it('POST /profiles/:username/follow should reject self-follow with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/profiles/${userA.username}/follow`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Accept-Language', 'vi')
        .expect(400);

      expect((res.body as { message: string }).message).toBe(
        getI18n('vi', 'profiles.CANNOT_FOLLOW_SELF'),
      );
    });

    it('POST & DELETE /profiles/:username/follow should be idempotent', async () => {
      const follow1 = await request(app.getHttpServer())
        .post(`/profiles/${userB.username}/follow`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect((follow1.body as { profile: { following: boolean } }).profile.following).toBe(true);

      const follow2 = await request(app.getHttpServer())
        .post(`/profiles/${userB.username}/follow`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect((follow2.body as { profile: { following: boolean } }).profile.following).toBe(true);

      const getAsA = await request(app.getHttpServer())
        .get(`/profiles/${userB.username}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect((getAsA.body as { profile: { following: boolean } }).profile.following).toBe(true);

      const getAsB = await request(app.getHttpServer())
        .get(`/profiles/${userA.username}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      expect((getAsB.body as { profile: { following: boolean } }).profile.following).toBe(false);

      const unfollow1 = await request(app.getHttpServer())
        .delete(`/profiles/${userB.username}/follow`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect((unfollow1.body as { profile: { following: boolean } }).profile.following).toBe(false);

      const unfollow2 = await request(app.getHttpServer())
        .delete(`/profiles/${userB.username}/follow`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect((unfollow2.body as { profile: { following: boolean } }).profile.following).toBe(false);
    });
  });
});
