import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { db } from '../src/common/database/db.js';
import type { UserRecord } from '../src/modules/users/users.service.js';
import {
  closeDatabase,
  flushTestRedis,
  truncateDatabase,
} from './helpers/db-test.helper.js';
import { createE2EApp } from './helpers/e2e-app.helper.js';
import { getI18n } from './helpers/i18n-test.helper.js';
import {
  blacklistTestToken,
  createFakeFollow,
  createFakeUser,
  createTestAccessToken,
} from './helpers/test-factory.helper.js';

describe('ProfilesController (E2E - C2 Coverage)', () => {
  let app: NestExpressApplication;
  let actor: UserRecord;
  let target: UserRecord;
  let inactiveUser: UserRecord;
  let actorToken: string;

  beforeAll(async () => {
    app = await createE2EApp();
    await Promise.all([truncateDatabase(), flushTestRedis(app)]);
  });

  beforeEach(async () => {
    const [actorRes, targetRes, inactiveRes] = await Promise.all([
      createFakeUser({
        username: 'actor_user',
        bio: 'Actor bio',
        image: 'https://example.com/actor.png',
      }),
      createFakeUser({
        username: 'target_user',
        bio: 'Target bio',
        image: 'https://example.com/target.png',
      }),
      createFakeUser({
        username: 'inactive_user',
        bio: 'Inactive bio',
        isActive: false,
      }),
    ]);

    actor = actorRes.user;
    target = targetRes.user;
    inactiveUser = inactiveRes.user;
    actorToken = await createTestAccessToken(app, actor);
  });

  afterEach(async () => {
    const results = await Promise.allSettled([
      truncateDatabase(),
      app ? flushTestRedis(app) : Promise.resolve(),
    ]);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (rejected) {
      throw rejected.reason;
    }
  });

  afterAll(async () => {
    try {
      if (app) {
        await app.close();
      }
    } finally {
      await closeDatabase();
    }
  });

  describe('GET /profiles/:username', () => {
    it('200 (Guest): returns profile with following=false when Authorization header is absent', async () => {
      const res = await request(app.getHttpServer())
        .get(`/profiles/${target.username}`)
        .expect(200);

      expect(res.body).toEqual({
        profile: {
          username: target.username,
          bio: target.bio,
          image: target.image,
          following: false,
        },
      });
    });

    it('200 (Self): returns following=false when authenticated user views own profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`/profiles/${actor.username}`)
        .set('Authorization', `Bearer ${actorToken}`)
        .expect(200);

      expect(res.body).toEqual({
        profile: {
          username: actor.username,
          bio: actor.bio,
          image: actor.image,
          following: false,
        },
      });
    });

    it('200 (Not Following): returns following=false when authenticated user does not follow target', async () => {
      const res = await request(app.getHttpServer())
        .get(`/profiles/${target.username}`)
        .set('Authorization', `Bearer ${actorToken}`)
        .expect(200);

      expect(res.body.profile.following).toBe(false);
    });

    it('200 (Following): returns following=true when authenticated user follows target', async () => {
      await createFakeFollow(actor.id, target.id);

      const res = await request(app.getHttpServer())
        .get(`/profiles/${target.username}`)
        .set('Authorization', `Bearer ${actorToken}`)
        .expect(200);

      expect(res.body).toEqual({
        profile: {
          username: target.username,
          bio: target.bio,
          image: target.image,
          following: true,
        },
      });
    });

    it('200 (Trim): trims leading/trailing whitespace in username parameter', async () => {
      const res = await request(app.getHttpServer())
        .get(`/profiles/${encodeURIComponent(`  ${target.username}  `)}`)
        .expect(200);

      expect(res.body.profile.username).toBe(target.username);
    });

    it.each(['en', 'vi'] as const)(
      '404 (%s): returns USER_NOT_FOUND when target user does not exist',
      async (lang) => {
        const res = await request(app.getHttpServer())
          .get('/profiles/non_existent_user_999')
          .set('Accept-Language', lang)
          .expect(404);

        expect(res.body.message).toBe(getI18n(lang, 'profiles.USER_NOT_FOUND'));
      },
    );

    it.each(['en', 'vi'] as const)(
      '404 (%s): returns USER_NOT_FOUND when target user exists but isActive=false',
      async (lang) => {
        const res = await request(app.getHttpServer())
          .get(`/profiles/${inactiveUser.username}`)
          .set('Accept-Language', lang)
          .expect(404);

        expect(res.body.message).toBe(getI18n(lang, 'profiles.USER_NOT_FOUND'));
      },
    );

    it('401: rejects malformed Bearer token even on @OptionalAuth() route', async () => {
      await request(app.getHttpServer())
        .get(`/profiles/${target.username}`)
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });

    it('401: rejects expired Bearer token on @OptionalAuth() route', async () => {
      const expiredToken = await createTestAccessToken(app, actor, {
        expiresIn: '-1s',
      });

      const res = await request(app.getHttpServer())
        .get(`/profiles/${target.username}`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body.message).toBe(getI18n('en', 'auth.TOKEN_EXPIRED'));
    });

    it('401: rejects blacklisted Bearer token on @OptionalAuth() route', async () => {
      await blacklistTestToken(app, actorToken);

      const res = await request(app.getHttpServer())
        .get(`/profiles/${target.username}`)
        .set('Authorization', `Bearer ${actorToken}`)
        .expect(401);

      expect(res.body.message).toBe(getI18n('en', 'auth.TOKEN_REVOKED'));
    });
  });

  describe('POST /profiles/:username/follow', () => {
    it('401: rejects request without Authorization header', async () => {
      await request(app.getHttpServer())
        .post(`/profiles/${target.username}/follow`)
        .expect(401);
    });

    it('401: rejects invalid Bearer token', async () => {
      await request(app.getHttpServer())
        .post(`/profiles/${target.username}/follow`)
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });

    it('404: returns USER_NOT_FOUND when target user does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/profiles/non_existent_user_999/follow')
        .set('Authorization', `Bearer ${actorToken}`)
        .expect(404);

      expect(res.body.message).toBe(getI18n('en', 'profiles.USER_NOT_FOUND'));
    });

    it('404: returns USER_NOT_FOUND when target user has isActive=false', async () => {
      const res = await request(app.getHttpServer())
        .post(`/profiles/${inactiveUser.username}/follow`)
        .set('Authorization', `Bearer ${actorToken}`)
        .expect(404);

      expect(res.body.message).toBe(getI18n('en', 'profiles.USER_NOT_FOUND'));
    });

    it.each(['en', 'vi'] as const)(
      '400 (%s): rejects self-follow and does not insert Follow row in DB',
      async (lang) => {
        const res = await request(app.getHttpServer())
          .post(`/profiles/${actor.username}/follow`)
          .set('Authorization', `Bearer ${actorToken}`)
          .set('Accept-Language', lang)
          .expect(400);

        expect(res.body.message).toBe(
          getI18n(lang, 'profiles.CANNOT_FOLLOW_SELF'),
        );

        const followRows = await db.orm.public.Follow.where({
          followerId: actor.id,
          followingId: actor.id,
        }).all();
        expect(followRows).toHaveLength(0);
      },
    );

    it('200: follows target user, returns following=true, and persists Follow record in DB', async () => {
      const res = await request(app.getHttpServer())
        .post(`/profiles/${target.username}/follow`)
        .set('Authorization', `Bearer ${actorToken}`)
        .expect(200);

      expect(res.body).toEqual({
        profile: {
          username: target.username,
          bio: target.bio,
          image: target.image,
          following: true,
        },
      });

      const followRows = await db.orm.public.Follow.where({
        followerId: actor.id,
        followingId: target.id,
      }).all();
      expect(followRows).toHaveLength(1);
    });

    it('200 (Idempotent): following an already-followed user succeeds without duplicate DB rows', async () => {
      await createFakeFollow(actor.id, target.id);

      const res = await request(app.getHttpServer())
        .post(`/profiles/${target.username}/follow`)
        .set('Authorization', `Bearer ${actorToken}`)
        .expect(200);

      expect(res.body.profile.following).toBe(true);

      const followRows = await db.orm.public.Follow.where({
        followerId: actor.id,
        followingId: target.id,
      }).all();
      expect(followRows).toHaveLength(1);
    });
  });

  describe('DELETE /profiles/:username/follow', () => {
    it('401: rejects request without Authorization header', async () => {
      await request(app.getHttpServer())
        .delete(`/profiles/${target.username}/follow`)
        .expect(401);
    });

    it('404: returns USER_NOT_FOUND when target user does not exist', async () => {
      const res = await request(app.getHttpServer())
        .delete('/profiles/non_existent_user_999/follow')
        .set('Authorization', `Bearer ${actorToken}`)
        .expect(404);

      expect(res.body.message).toBe(getI18n('en', 'profiles.USER_NOT_FOUND'));
    });

    it('404: returns USER_NOT_FOUND when target user has isActive=false', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/profiles/${inactiveUser.username}/follow`)
        .set('Authorization', `Bearer ${actorToken}`)
        .expect(404);

      expect(res.body.message).toBe(getI18n('en', 'profiles.USER_NOT_FOUND'));
    });

    it.each(['en', 'vi'] as const)(
      '400 (%s): rejects self-unfollow',
      async (lang) => {
        const res = await request(app.getHttpServer())
          .delete(`/profiles/${actor.username}/follow`)
          .set('Authorization', `Bearer ${actorToken}`)
          .set('Accept-Language', lang)
          .expect(400);

        expect(res.body.message).toBe(
          getI18n(lang, 'profiles.CANNOT_UNFOLLOW_SELF'),
        );
      },
    );

    it('200: unfollows target user, returns following=false, and removes Follow record from DB', async () => {
      await createFakeFollow(actor.id, target.id);

      const res = await request(app.getHttpServer())
        .delete(`/profiles/${target.username}/follow`)
        .set('Authorization', `Bearer ${actorToken}`)
        .expect(200);

      expect(res.body).toEqual({
        profile: {
          username: target.username,
          bio: target.bio,
          image: target.image,
          following: false,
        },
      });

      const followRows = await db.orm.public.Follow.where({
        followerId: actor.id,
        followingId: target.id,
      }).all();
      expect(followRows).toHaveLength(0);
    });

    it('200 (Idempotent): unfollowing a user who is not followed still returns following=false', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/profiles/${target.username}/follow`)
        .set('Authorization', `Bearer ${actorToken}`)
        .expect(200);

      expect(res.body.profile.following).toBe(false);
    });
  });
});
