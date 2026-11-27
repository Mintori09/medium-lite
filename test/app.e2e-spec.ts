import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { env } from '../src/common/configs/env.config.js';
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
  let refreshCookie = '';

  const extractRefreshCookie = (
    setCookieHeader: string[] | string | undefined,
  ): string => {
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : setCookieHeader
        ? [setCookieHeader]
        : [];
    const found = cookies.find((cookie) => cookie.startsWith('refreshToken='));
    expect(found).toBeDefined();
    expect(found).toContain('HttpOnly');
    expect(found).toContain('SameSite=Strict');
    expect(found).toContain('Path=/auth');
    expect(found).toContain('Max-Age=');
    return found!.split(';')[0];
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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

  it('/auth/register (POST) - should reject password exceeding 72 UTF-8 bytes (e.g. Vietnamese multi-byte)', async () => {
    const resEn = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `longpw_${uniqueId}@example.com`,
        username: `user_lpw_${uniqueId}`,
        password: 'ế'.repeat(25), // 25 chars, 75 UTF-8 bytes
      })
      .expect(400);

    expect(JSON.stringify(resEn.body)).toContain('72 bytes');

    const resVi = await request(app.getHttpServer())
      .post('/auth/register')
      .set('Accept-Language', 'vi')
      .send({
        email: `longpw_vi_${uniqueId}@example.com`,
        username: `user_lpw_vi_${uniqueId}`,
        password: 'ế'.repeat(25),
      })
      .expect(400);

    expect(JSON.stringify(resVi.body)).toContain('72 byte');
  });

  it('/auth/register (POST) - should handle concurrent duplicate registrations with 409 instead of 500', async () => {
    const concurrentUser = {
      email: `race_${uniqueId}@example.com`,
      username: `race_${uniqueId}`,
      password: 'Password1234',
    };

    const [res1, res2] = await Promise.all([
      request(app.getHttpServer()).post('/auth/register').send(concurrentUser),
      request(app.getHttpServer()).post('/auth/register').send(concurrentUser),
    ]);

    const statuses = [res1.status, res2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);
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

  it('/auth/login (POST) - should login with case-insensitive email, return accessToken only, and set HttpOnly refresh cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser.email.toLowerCase(),
        password: testUser.password,
      })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).not.toHaveProperty('refreshToken');

    accessToken = res.body.accessToken;
    refreshCookie = extractRefreshCookie(res.headers['set-cookie']);
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

  it('/auth/refresh (POST) - should reject malformed refresh token cookie with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', 'refreshToken=not-a-valid-jwt')
      .expect(401);
  });

  it('/auth/refresh (POST) - should reject refresh token sent only in body without cookie', async () => {
    const rawToken = refreshCookie.replace('refreshToken=', '');
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: rawToken })
      .expect(401);
  });

  it('/auth/refresh (POST) - should refresh tokens via HttpOnly cookie and rotate stored token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).not.toHaveProperty('refreshToken');

    const oldRefreshCookie = refreshCookie;
    accessToken = res.body.accessToken;
    refreshCookie = extractRefreshCookie(res.headers['set-cookie']);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', oldRefreshCookie)
      .expect(401);
  });

  it('/auth/logout (POST) - should logout, clear refresh cookie, and blacklist the access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toEqual({
      message: getI18n('en', 'auth.LOGOUT_SUCCESS'),
    });
    const setCookies = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie']
      : [];
    const clearedCookie = setCookies.find((cookie) =>
      cookie.startsWith('refreshToken=;'),
    );
    expect(clearedCookie).toBeDefined();
    expect(clearedCookie).toContain('HttpOnly');
    expect(clearedCookie).toContain('Path=/auth');
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
