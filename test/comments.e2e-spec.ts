import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Comments (e2e)', () => {
  let app: INestApplication;
  let authorToken: string;
  let commenterToken: string;
  let otherToken: string;
  let articleSlug: string;
  let commentId: string;

  const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const password = 'Password123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `comment_author_${uniqueId}@example.com`,
        username: `c_author_${uniqueId}`,
        password,
      })
      .expect(201);
    const authorLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `comment_author_${uniqueId}@example.com`, password })
      .expect(200);
    authorToken = authorLogin.body.accessToken;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `commenter_${uniqueId}@example.com`,
        username: `c_user_${uniqueId}`,
        password,
      })
      .expect(201);
    const commenterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `commenter_${uniqueId}@example.com`, password })
      .expect(200);
    commenterToken = commenterLogin.body.accessToken;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `comment_other_${uniqueId}@example.com`,
        username: `c_other_${uniqueId}`,
        password,
      })
      .expect(201);
    const otherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `comment_other_${uniqueId}@example.com`, password })
      .expect(200);
    otherToken = otherLogin.body.accessToken;

    // otherUser follows commenter => can test author.following = true on GET comments
    await request(app.getHttpServer())
      .post(`/profiles/c_user_${uniqueId}/follow`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);

    const articleRes = await request(app.getHttpServer())
      .post('/articles')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        article: {
          title: `Comment Target Article ${uniqueId}`,
          description: 'Description for comment tests',
          body: 'Body for comment tests',
          tagList: ['comments'],
        },
      })
      .expect(201);
    articleSlug = articleRes.body.article.slug;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /articles/:slug/comments', () => {
    it('400 (BVA): rejects empty or whitespace-only comment body', async () => {
      await request(app.getHttpServer())
        .post(`/articles/${articleSlug}/comments`)
        .set('Authorization', `Bearer ${commenterToken}`)
        .send({ comment: { body: '   ' } })
        .expect(400);
    });

    it('201 (BVA): accepts 1-char comment body', async () => {
      const res = await request(app.getHttpServer())
        .post(`/articles/${articleSlug}/comments`)
        .set('Authorization', `Bearer ${commenterToken}`)
        .send({ comment: { body: 'a' } })
        .expect(201);

      expect(res.body.comment.body).toBe('a');
      commentId = res.body.comment.id;
    });

    it('201 (BVA): accepts 16,000-char comment body', async () => {
      const maxBody = 'x'.repeat(16_000);
      const res = await request(app.getHttpServer())
        .post(`/articles/${articleSlug}/comments`)
        .set('Authorization', `Bearer ${commenterToken}`)
        .send({ comment: { body: maxBody } })
        .expect(201);

      expect(res.body.comment.body).toHaveLength(16_000);
    });

    it('400 (BVA): rejects 16,001-char comment body', async () => {
      await request(app.getHttpServer())
        .post(`/articles/${articleSlug}/comments`)
        .set('Authorization', `Bearer ${commenterToken}`)
        .send({ comment: { body: 'x'.repeat(16_001) } })
        .expect(400);
    });

    it('400 (EP): rejects invalid slug regex or strict extra fields', async () => {
      await request(app.getHttpServer())
        .post('/articles/invalid@slug!/comments')
        .set('Authorization', `Bearer ${commenterToken}`)
        .send({ comment: { body: 'valid' } })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/articles/${articleSlug}/comments`)
        .set('Authorization', `Bearer ${commenterToken}`)
        .send({ comment: { body: 'valid', extra: 'nope' } })
        .expect(400);
    });

    it('404 (EP): returns 404 for non-existent article slug', async () => {
      await request(app.getHttpServer())
        .post('/articles/non-existent-article-slug-999/comments')
        .set('Authorization', `Bearer ${commenterToken}`)
        .send({ comment: { body: 'valid' } })
        .expect(404);
    });
  });

  describe('GET /articles/:slug/comments', () => {
    it('400 (BVA): rejects limit=0, limit=101, and offset=-1', async () => {
      await request(app.getHttpServer())
        .get(`/articles/${articleSlug}/comments?limit=0`)
        .expect(400);

      await request(app.getHttpServer())
        .get(`/articles/${articleSlug}/comments?limit=101`)
        .expect(400);

      await request(app.getHttpServer())
        .get(`/articles/${articleSlug}/comments?offset=-1`)
        .expect(400);
    });

    it('200 (BVA & Decision Table): returns comments for guest (following=false) and follower (following=true)', async () => {
      const guestRes = await request(app.getHttpServer())
        .get(`/articles/${articleSlug}/comments?limit=1&offset=0`)
        .expect(200);
      expect(guestRes.body.comments).toHaveLength(1);
      expect(guestRes.body.comments[0].author.following).toBe(false);

      const followerRes = await request(app.getHttpServer())
        .get(`/articles/${articleSlug}/comments?limit=100&offset=0`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);
      expect(followerRes.body.comments.length).toBeGreaterThanOrEqual(2);
      expect(followerRes.body.comments[0].author.following).toBe(true);
    });

    it('401 (Decision Table): rejects invalid Bearer token on @OptionalAuth() route', async () => {
      await request(app.getHttpServer())
        .get(`/articles/${articleSlug}/comments`)
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });

    it('404: returns 404 for non-existent article slug', async () => {
      await request(app.getHttpServer())
        .get('/articles/non-existent-article-slug-999/comments')
        .expect(404);
    });
  });

  describe('DELETE /articles/:slug/comments/:id', () => {
    it('400 (EP): rejects non-UUID comment id', async () => {
      await request(app.getHttpServer())
        .delete(`/articles/${articleSlug}/comments/not-a-uuid`)
        .set('Authorization', `Bearer ${commenterToken}`)
        .expect(400);
    });

    it('401: rejects unauthenticated delete', async () => {
      await request(app.getHttpServer())
        .delete(`/articles/${articleSlug}/comments/${commentId}`)
        .expect(401);
    });

    it('403 (Decision Table): forbids article author from deleting another user comment', async () => {
      await request(app.getHttpServer())
        .delete(`/articles/${articleSlug}/comments/${commentId}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(403);
    });

    it('404 (EP): returns 404 for unknown UUID or mismatched article slug', async () => {
      await request(app.getHttpServer())
        .delete(
          `/articles/${articleSlug}/comments/00000000-0000-4000-8000-000000000000`,
        )
        .set('Authorization', `Bearer ${commenterToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/articles/non-existent-slug-999/comments/${commentId}`)
        .set('Authorization', `Bearer ${commenterToken}`)
        .expect(404);
    });

    it('204 (State Transition): allows comment author to delete and removes from GET', async () => {
      await request(app.getHttpServer())
        .delete(`/articles/${articleSlug}/comments/${commentId}`)
        .set('Authorization', `Bearer ${commenterToken}`)
        .expect(204);

      const listRes = await request(app.getHttpServer())
        .get(`/articles/${articleSlug}/comments`)
        .expect(200);
      const ids = listRes.body.comments.map((c: { id: string }) => c.id);
      expect(ids).not.toContain(commentId);
    });
  });

  describe('POST /articles/:slug/comments Throttle', () => {
    it('429: blocks excessive comment creation (>10 requests per 60s)', async () => {
      let hit429 = false;
      for (let i = 0; i < 12; i++) {
        const res = await request(app.getHttpServer())
          .post(`/articles/${articleSlug}/comments`)
          .set('Authorization', `Bearer ${otherToken}`)
          .send({ comment: { body: `spam ${i}` } });
        if (res.status === 429) {
          hit429 = true;
          break;
        }
      }
      expect(hit429).toBe(true);
    });
  });
});
