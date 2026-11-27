import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { env } from '../src/common/configs/env.config.js';
import { createE2EApp } from './helpers/e2e-app.helper.js';
import { getI18n } from './helpers/i18n-test.helper.js';

describe('Auth System (e2e)', () => {
  let app: INestApplication<App>;
  const uniqueId = Date.now();
  const testUser = {
    email: `E2E_${uniqueId}@Example.COM`,
    username: `user_${uniqueId}`,
    password: 'Password1234',
    bio: 'e2e bio test',
  };

  let accessToken = '';
  let refreshToken = '';

  beforeAll(async () => {
    app = await createE2EApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/auth/register (POST) - should reject invalid password (strength rules)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `invalid_${uniqueId}@example.com`,
        username: `user_inv_${uniqueId}`,
        password: 'weak',
      })
      .expect(400);
  });

  it('/auth/register (POST) - should reject invalid username with spaces or special chars', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `invalid2_${uniqueId}@example.com`,
        username: 'user with spaces!',
        password: 'Password1234',
      })
      .expect(400);
  });

  it('/auth/register (POST) - should register a new user and normalize email/username', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body).toEqual({
      message: getI18n('en', 'auth.REGISTER_SUCCESS'),
    });
  });

  it('/auth/register (POST) - should reject duplicate email with 409 Conflict', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...testUser,
        username: `diff_${uniqueId}`,
      })
      .expect(409);

    expect(res.body.message).toBe(getI18n('en', 'auth.EMAIL_EXISTS'));
  });

  it('/auth/register (POST) - should reject duplicate username with 409 Conflict (bilingual)', async () => {
    // English
    const resEn = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...testUser,
        email: `diff_en_${uniqueId}@example.com`,
      })
      .expect(409);

    expect(resEn.body.message).toBe(getI18n('en', 'auth.USERNAME_EXISTS'));

    // Vietnamese
    const resVi = await request(app.getHttpServer())
      .post('/auth/register')
      .set('Accept-Language', 'vi')
      .send({
        ...testUser,
        email: `diff_vi_${uniqueId}@example.com`,
      })
      .expect(409);

    expect(resVi.body.message).toBe(getI18n('vi', 'auth.USERNAME_EXISTS'));
  });

  it('/auth/login (POST) - should login with case-insensitive email and return tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser.email.toLowerCase(),
        password: testUser.password,
      })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('/auth/me (GET) - should get current user profile and serialize out passwordHash', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('id');
    expect(res.body.email).toBe(testUser.email.toLowerCase());
    expect(res.body.username).toBe(testUser.username);
    expect(res.body.bio).toBe(testUser.bio);
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('/auth/refresh (POST) - should reject malformed refresh token with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'not-a-valid-jwt' })
      .expect(401);
  });

  it('/auth/refresh (POST) - should refresh tokens and rotate stored token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');

    const oldRefreshToken = refreshToken;
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(401);
  });

  it('/auth/logout (POST) - should logout and blacklist the access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toEqual({
      message: getI18n('en', 'auth.LOGOUT_SUCCESS'),
    });
  });

  it('/auth/me (GET) - should reject blacklisted access token after logout (bilingual)', async () => {
    // English
    const resEn = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);

    expect(resEn.body.message).toBe(getI18n('en', 'auth.TOKEN_REVOKED'));

    // Vietnamese
    const resVi = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept-Language', 'vi')
      .expect(401);

    expect(resVi.body.message).toBe(getI18n('vi', 'auth.TOKEN_REVOKED'));
  });

  it('/auth/logout (POST) - should reject double logout with already revoked token (bilingual)', async () => {
    // English
    const resEn = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);

    expect(resEn.body.message).toBe(getI18n('en', 'auth.TOKEN_REVOKED'));

    // Vietnamese
    const resVi = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept-Language', 'vi')
      .expect(401);

    expect(resVi.body.message).toBe(getI18n('vi', 'auth.TOKEN_REVOKED'));
  });

  it('/auth/me (GET) - should reject expired access token with 401 (bilingual)', async () => {
    const jwtService = app.get(JwtService);
    const expiredToken = await jwtService.signAsync(
      { sub: 'test-user-id', email: 'test@example.com', username: 'testuser' },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: '-1s' as any },
    );

    // English
    const resEn = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(resEn.body.message).toBe(getI18n('en', 'auth.TOKEN_EXPIRED'));

    // Vietnamese
    const resVi = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .set('Accept-Language', 'vi')
      .expect(401);

    expect(resVi.body.message).toBe(getI18n('vi', 'auth.TOKEN_EXPIRED'));
  });

  it('/auth/login (POST) - should block brute force attempts with 429 Too Many Requests', async () => {
    const requests = Array.from({ length: 6 }).map(() =>
      request(app.getHttpServer()).post('/auth/login').send({
        email: 'bruteforce@example.com',
        password: 'Password1234',
      }),
    );

    const responses = await Promise.all(requests);
    const hasThrottled = responses.some((res) => res.status === 429);
    expect(hasThrottled).toBe(true);
  });
});
