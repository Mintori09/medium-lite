import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Articles & Tags (e2e)', () => {
  let app: NestExpressApplication;
  const uniqueId = Date.now();

  const userA = {
    email: `art_a_${uniqueId}@example.com`,
    username: `art_a_${uniqueId}`,
    password: 'Password1234!',
  };

  const userB = {
    email: `art_b_${uniqueId}@example.com`,
    username: `art_b_${uniqueId}`,
    password: 'Password1234!',
  };

  let tokenA = '';
  let tokenB = '';
  let slugA = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.use(cookieParser());
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
    tokenA = loginA.body.accessToken;

    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userB.email, password: userB.password })
      .expect(200);
    tokenB = loginB.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /articles - rejects unauthenticated request with 401', async () => {
    await request(app.getHttpServer())
      .post('/articles')
      .send({
        article: { title: 'Unauth', description: 'Desc', body: 'Body' },
      })
      .expect(401);
  });

  it('POST /articles - rejects invalid body with 400', async () => {
    await request(app.getHttpServer())
      .post('/articles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        article: { title: '   ', description: 'Desc', body: 'Body' },
      })
      .expect(400);
  });

  it('POST /articles - creates article with normalized tags and returns 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/articles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        article: {
          title: 'Shared Title',
          description: 'Ever wonder how?',
          body: 'You have to believe',
          tagList: ['JavaScript', '  nestjs ', 'javascript'],
        },
      })
      .expect(201);

    slugA = res.body.article.slug;
    expect(slugA).toMatch(/^shared-title-[a-f0-9]{6}$/);
    expect(res.body.article.tagList).toEqual(['javascript', 'nestjs']);
    expect(res.body.article.favorited).toBe(false);
    expect(res.body.article.favoritesCount).toBe(0);
    expect(res.body.article.author.username).toBe(userA.username);
  });

  it('POST /articles - allows another user to create an article with the same title', async () => {
    const res = await request(app.getHttpServer())
      .post('/articles')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        article: {
          title: 'Shared Title',
          description: 'User B desc',
          body: 'User B body',
          tagList: ['java'],
        },
      })
      .expect(201);

    expect(res.body.article.slug).not.toBe(slugA);
  });

  it('GET /articles/:slug - returns article for guest and 404 for unknown slug', async () => {
    const res = await request(app.getHttpServer())
      .get(`/articles/${slugA}`)
      .expect(200);
    expect(res.body.article.slug).toBe(slugA);

    await request(app.getHttpServer())
      .get('/articles/non-existent-slug-000000')
      .expect(404);
  });

  it('GET /articles - exact tag match (java does not match javascript)', async () => {
    const res = await request(app.getHttpServer())
      .get('/articles?tag=java')
      .expect(200);

    expect(res.body.articlesCount).toBeGreaterThanOrEqual(1);
    for (const art of res.body.articles) {
      expect(art.tagList).toContain('java');
    }
  });

  it('GET /articles - rejects limit=0 and limit=101 with 400', async () => {
    await request(app.getHttpServer()).get('/articles?limit=0').expect(400);
    await request(app.getHttpServer()).get('/articles?limit=101').expect(400);
  });

  it('GET /articles/feed - returns only articles from followed authors', async () => {
    await request(app.getHttpServer())
      .post(`/profiles/${userA.username}/follow`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/articles/feed')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(res.body.articlesCount).toBeGreaterThanOrEqual(1);
    expect(
      res.body.articles.every(
        (a: { author: { username: string } }) =>
          a.author.username === userA.username,
      ),
    ).toBe(true);
  });

  it('POST & DELETE /articles/:slug/favorite - idempotent and handles concurrent requests', async () => {
    const results = await Promise.all([
      request(app.getHttpServer())
        .post(`/articles/${slugA}/favorite`)
        .set('Authorization', `Bearer ${tokenB}`),
      request(app.getHttpServer())
        .post(`/articles/${slugA}/favorite`)
        .set('Authorization', `Bearer ${tokenB}`),
    ]);

    for (const r of results) {
      expect(r.status).toBe(200);
    }

    const detail = await request(app.getHttpServer())
      .get(`/articles/${slugA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(detail.body.article.favorited).toBe(true);
    expect(detail.body.article.favoritesCount).toBe(1);

    const unfav = await request(app.getHttpServer())
      .delete(`/articles/${slugA}/favorite`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(unfav.body.article.favorited).toBe(false);
    expect(unfav.body.article.favoritesCount).toBe(0);
  });

  it('PUT /articles/:slug - forbids non-author (403) and allows author keeping slug', async () => {
    await request(app.getHttpServer())
      .put(`/articles/${slugA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ article: { title: 'Hacked' } })
      .expect(403);

    await request(app.getHttpServer())
      .put(`/articles/${slugA}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ article: {} })
      .expect(400);

    const updated = await request(app.getHttpServer())
      .put(`/articles/${slugA}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ article: { title: 'Updated Title' } })
      .expect(200);

    expect(updated.body.article.title).toBe('Updated Title');
    expect(updated.body.article.slug).toBe(slugA);
  });

  it('GET /tags - returns public list of unique sorted tags', async () => {
    const res = await request(app.getHttpServer()).get('/tags').expect(200);
    expect(res.body.tags).toEqual(
      expect.arrayContaining(['java', 'javascript', 'nestjs']),
    );
  });

  it('DELETE /articles/:slug - forbids non-author (403) and deletes as author (204)', async () => {
    await request(app.getHttpServer())
      .delete(`/articles/${slugA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/articles/${slugA}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(204);

    await request(app.getHttpServer()).get(`/articles/${slugA}`).expect(404);
  });

  it('i18n - returns Vietnamese error message when Accept-Language: vi', async () => {
    const res = await request(app.getHttpServer())
      .get('/articles/non-existent-slug-000000')
      .set('Accept-Language', 'vi')
      .expect(404);

    expect(res.body.message).toBe('Không tìm thấy bài viết');
  });
});
