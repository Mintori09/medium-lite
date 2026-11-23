import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { I18nService } from 'nestjs-i18n';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../common/database/db.js';
import type { I18nTranslations } from '../../generated/i18n.generated.js';
import { ArticlesService } from './articles.service.js';

describe('ArticlesService', () => {
  let service: ArticlesService;

  const now = new Date('2026-11-23T07:00:00.000Z');
  const mockAuthor = {
    id: 'user-1',
    username: 'jake',
    bio: 'bio',
    image: null,
  };
  const mockArticleRow = {
    id: 'art-1',
    slug: 'title-abc123',
    title: 'Title',
    description: 'Desc',
    body: 'Body',
    favoritesCount: 0,
    authorId: 'user-1',
    createdAt: now,
    updatedAt: now,
  };

  const mockI18n = {
    translate: vi.fn((key: string) => key),
  } as unknown as I18nService<I18nTranslations>;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new ArticlesService(mockI18n);
  });

  function mockEnrichmentEmpty() {
    vi.spyOn(db.orm.public.User, 'where').mockReturnValue({
      all: vi.fn().mockResolvedValue([mockAuthor]),
    } as never);
    vi.spyOn(db.orm.public.ArticleTag, 'where').mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
    } as never);
    vi.spyOn(db.orm.public.ArticleFavorite, 'where').mockReturnValue({
      where: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue([]),
    } as never);
    vi.spyOn(db.orm.public.Follow, 'where').mockReturnValue({
      where: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue([]),
    } as never);
  }

  describe('create', () => {
    it('creates an article without tags', async () => {
      vi.spyOn(db, 'transaction').mockImplementation(async (fn) => {
        const tx = {
          orm: {
            public: {
              Article: {
                create: vi.fn().mockResolvedValue(mockArticleRow),
              },
            },
          },
        };
        return fn(tx as never);
      });
      mockEnrichmentEmpty();

      const res = await service.create('user-1', {
        article: { title: 'Title', description: 'Desc', body: 'Body' },
      });
      expect(res.article.title).toBe('Title');
      expect(res.article.tagList).toEqual([]);
    });

    it('creates an article with tags and handles 23505 unique conflict', async () => {
      const uniqueErr = { sqlState: '23505', constraint: 'Tag_name_key' };
      vi.spyOn(db, 'transaction').mockImplementation(async (fn) => {
        const tx = {
          orm: {
            public: {
              Article: { create: vi.fn().mockResolvedValue(mockArticleRow) },
              Tag: {
                first: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockRejectedValue(uniqueErr),
                where: vi.fn().mockReturnValue({
                  all: vi.fn().mockResolvedValue([{ id: 'tag-1', name: 'ts' }]),
                }),
              },
              ArticleTag: {
                create: vi.fn().mockRejectedValue(uniqueErr),
              },
            },
          },
        };
        return fn(tx as never);
      });
      mockEnrichmentEmpty();

      const res = await service.create('user-1', {
        article: {
          title: 'Title',
          description: 'Desc',
          body: 'Body',
          tagList: ['ts'],
        },
      });
      expect(res.article.slug).toBe(mockArticleRow.slug);
    });

    it('rethrows non-unique errors during tag creation', async () => {
      vi.spyOn(db, 'transaction').mockImplementation(async (fn) => {
        const tx = {
          orm: {
            public: {
              Article: { create: vi.fn().mockResolvedValue(mockArticleRow) },
              Tag: {
                first: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockRejectedValue(new Error('DB down')),
              },
            },
          },
        };
        return fn(tx as never);
      });

      await expect(
        service.create('user-1', {
          article: {
            title: 'Title',
            description: 'Desc',
            body: 'Body',
            tagList: ['ts'],
          },
        }),
      ).rejects.toThrow('DB down');
    });
  });

  describe('findAll', () => {
    it('returns empty list when tag filter does not exist', async () => {
      vi.spyOn(db.orm.public.Tag, 'first').mockResolvedValue(null as never);
      const res = await service.findAll({
        tag: 'missing',
        limit: 20,
        offset: 0,
      });
      expect(res).toEqual({ articles: [], articlesCount: 0 });
    });

    it('returns empty list when author filter does not exist', async () => {
      vi.spyOn(db.orm.public.User, 'first').mockResolvedValue(null as never);
      const res = await service.findAll({
        author: 'missing',
        limit: 20,
        offset: 0,
      });
      expect(res).toEqual({ articles: [], articlesCount: 0 });
    });

    it('returns empty list when favorited user does not exist', async () => {
      vi.spyOn(db.orm.public.User, 'first').mockResolvedValue(null as never);
      const res = await service.findAll({
        favorited: 'missing',
        limit: 20,
        offset: 0,
      });
      expect(res).toEqual({ articles: [], articlesCount: 0 });
    });

    it('returns empty list when tag and favorited do not intersect', async () => {
      vi.spyOn(db.orm.public.Tag, 'first').mockResolvedValue({
        id: 't-1',
        name: 'nestjs',
      } as never);
      vi.spyOn(db.orm.public.ArticleTag, 'where').mockReturnValue({
        all: vi.fn().mockResolvedValue([{ articleId: 'art-1', tagId: 't-1' }]),
      } as never);
      vi.spyOn(db.orm.public.User, 'first')
        .mockResolvedValueOnce({ id: 'user-1' } as never)
        .mockResolvedValueOnce({ id: 'user-2' } as never);
      vi.spyOn(db.orm.public.ArticleFavorite, 'where').mockReturnValue({
        all: vi.fn().mockResolvedValue([{ articleId: 'art-2' }]),
      } as never);

      const res = await service.findAll({
        tag: 'nestjs',
        author: 'jake',
        favorited: 'bob',
        limit: 20,
        offset: 0,
      });
      expect(res).toEqual({ articles: [], articlesCount: 0 });
    });

    it('returns empty list when no articles match query', async () => {
      const chain = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(db.orm.public.Article, 'where').mockReturnValue(chain as never);

      const res = await service.findAll({ limit: 20, offset: 0 });
      expect(res).toEqual({ articles: [], articlesCount: 0 });
    });

    it('returns articles with enrichment when filters match', async () => {
      const chain = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([mockArticleRow]),
      };
      vi.spyOn(db.orm.public.Article, 'where').mockReturnValue(chain as never);
      vi.spyOn(db.orm.public.User, 'where').mockReturnValue({
        all: vi.fn().mockResolvedValue([mockAuthor]),
      } as never);
      vi.spyOn(db.orm.public.ArticleTag, 'where').mockReturnValue({
        all: vi.fn().mockResolvedValue([{ articleId: 'art-1', tagId: 't-1' }]),
      } as never);
      vi.spyOn(db.orm.public.Tag, 'where').mockReturnValue({
        all: vi.fn().mockResolvedValue([{ id: 't-1', name: 'nestjs' }]),
      } as never);
      vi.spyOn(db.orm.public.ArticleFavorite, 'where').mockReturnValue({
        where: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([{ articleId: 'art-1' }]),
      } as never);
      vi.spyOn(db.orm.public.Follow, 'where').mockReturnValue({
        where: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([{ followingId: 'user-1' }]),
      } as never);

      const res = await service.findAll({ limit: 20, offset: 0 }, 'user-2');
      expect(res.articlesCount).toBe(1);
      expect(res.articles[0]?.tagList).toEqual(['nestjs']);
      expect(res.articles[0]?.favorited).toBe(true);
      expect(res.articles[0]?.author.following).toBe(true);
    });
  });

  describe('findFeed', () => {
    it('returns empty list when user follows no one', async () => {
      vi.spyOn(db.orm.public.Follow, 'where').mockReturnValue({
        all: vi.fn().mockResolvedValue([]),
      } as never);
      const res = await service.findFeed('user-1', { limit: 20, offset: 0 });
      expect(res).toEqual({ articles: [], articlesCount: 0 });
    });

    it('returns feed articles from followed authors', async () => {
      const chain = {
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([mockArticleRow]),
      };
      vi.spyOn(db.orm.public.Article, 'where').mockReturnValue(chain as never);
      mockEnrichmentEmpty();
      vi.spyOn(db.orm.public.Follow, 'where').mockReturnValue({
        where: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([{ followingId: 'user-1' }]),
      } as never);

      const res = await service.findFeed('user-2', { limit: 20, offset: 0 });
      expect(res.articlesCount).toBe(1);
    });
  });

  describe('findBySlug', () => {
    it('throws NotFoundException when article does not exist', async () => {
      vi.spyOn(db.orm.public.Article, 'first').mockResolvedValue(
        null as never,
      );
      await expect(service.findBySlug('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update & remove', () => {
    it('throws ForbiddenException when updating another user article', async () => {
      vi.spyOn(db.orm.public.Article, 'first').mockResolvedValue(
        mockArticleRow as never,
      );
      mockEnrichmentEmpty();
      mockEnrichmentEmpty();

      await expect(
        service.update('title-abc123', 'other-user', {
          article: { title: 'New' },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates article and tags when owner', async () => {
      vi.spyOn(db.orm.public.Article, 'first').mockResolvedValue(
        mockArticleRow as never,
      );
      mockEnrichmentEmpty();
      vi.spyOn(db, 'transaction').mockImplementation(async (fn) => {
        const tx = {
          orm: {
            public: {
              Article: {
                where: vi.fn().mockReturnValue({ update: vi.fn() }),
              },
              ArticleTag: {
                where: vi.fn().mockReturnValue({ delete: vi.fn() }),
                create: vi.fn(),
              },
              Tag: {
                first: vi.fn().mockResolvedValue({ id: 't-1', name: 'ts' }),
                where: vi.fn().mockReturnValue({
                  all: vi.fn().mockResolvedValue([{ id: 't-1', name: 'ts' }]),
                }),
              },
            },
          },
        };
        return fn(tx as never);
      });
      mockEnrichmentEmpty();

      const res = await service.update('title-abc123', 'user-1', {
        article: { title: 'New', tagList: ['ts'] },
      });
      expect(res.article.slug).toBe('title-abc123');
    });

    it('throws ForbiddenException when deleting another user article', async () => {
      vi.spyOn(db.orm.public.Article, 'first').mockResolvedValue(
        mockArticleRow as never,
      );
      mockEnrichmentEmpty();
      mockEnrichmentEmpty();

      await expect(
        service.remove('title-abc123', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deletes article when owner', async () => {
      vi.spyOn(db.orm.public.Article, 'first').mockResolvedValue(
        mockArticleRow as never,
      );
      mockEnrichmentEmpty();
      const deleteMock = vi.fn().mockResolvedValue(mockArticleRow);
      vi.spyOn(db.orm.public.Article, 'where').mockReturnValue({
        delete: deleteMock,
      } as never);
      mockEnrichmentEmpty();

      await service.remove('title-abc123', 'user-1');
      expect(deleteMock).toHaveBeenCalledOnce();
    });
  });

  describe('favorite & unfavorite', () => {
    it('increments favoritesCount on new favorite', async () => {
      vi.spyOn(db.orm.public.Article, 'first').mockResolvedValue(
        mockArticleRow as never,
      );
      mockEnrichmentEmpty();
      const updateMock = vi.fn();
      vi.spyOn(db, 'transaction').mockImplementation(async (fn) => {
        const tx = {
          orm: {
            public: {
              ArticleFavorite: { create: vi.fn().mockResolvedValue({}) },
              Article: {
                first: vi.fn().mockResolvedValue(mockArticleRow),
                where: vi.fn().mockReturnValue({ update: updateMock }),
              },
            },
          },
        };
        return fn(tx as never);
      });
      mockEnrichmentEmpty();

      await service.favorite('title-abc123', 'user-1');
      expect(updateMock).toHaveBeenCalledWith({ favoritesCount: 1 });
    });

    it('is idempotent when favorite already exists (23505)', async () => {
      vi.spyOn(db.orm.public.Article, 'first').mockResolvedValue(
        mockArticleRow as never,
      );
      mockEnrichmentEmpty();
      const updateMock = vi.fn();
      vi.spyOn(db, 'transaction').mockImplementation(async (fn) => {
        const tx = {
          orm: {
            public: {
              ArticleFavorite: {
                create: vi.fn().mockRejectedValue({ sqlState: '23505' }),
              },
              Article: {
                where: vi.fn().mockReturnValue({ update: updateMock }),
              },
            },
          },
        };
        return fn(tx as never);
      });
      mockEnrichmentEmpty();

      await service.favorite('title-abc123', 'user-1');
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('rethrows non-unique errors during favorite', async () => {
      vi.spyOn(db.orm.public.Article, 'first').mockResolvedValue(
        mockArticleRow as never,
      );
      mockEnrichmentEmpty();
      vi.spyOn(db, 'transaction').mockImplementation(async (fn) => {
        const tx = {
          orm: {
            public: {
              ArticleFavorite: {
                create: vi.fn().mockRejectedValue(new Error('DB error')),
              },
            },
          },
        };
        return fn(tx as never);
      });

      await expect(service.favorite('title-abc123', 'user-1')).rejects.toThrow(
        'DB error',
      );
    });

    it('decrements favoritesCount on unfavorite', async () => {
      const favArticle = { ...mockArticleRow, favoritesCount: 2 };
      vi.spyOn(db.orm.public.Article, 'first').mockResolvedValue(
        favArticle as never,
      );
      const updateMock = vi.fn();
      vi.spyOn(db, 'transaction').mockImplementation(async (fn) => {
        const tx = {
          orm: {
            public: {
              ArticleFavorite: {
                where: vi.fn().mockReturnValue({
                  delete: vi.fn().mockResolvedValue({ userId: 'user-1' }),
                }),
              },
              Article: {
                first: vi.fn().mockResolvedValue(favArticle),
                where: vi.fn().mockReturnValue({ update: updateMock }),
              },
            },
          },
        };
        return fn(tx as never);
      });
      mockEnrichmentEmpty();

      await service.unfavorite('title-abc123', 'user-1');
      expect(updateMock).toHaveBeenCalledWith({ favoritesCount: 1 });
    });
  });
});
