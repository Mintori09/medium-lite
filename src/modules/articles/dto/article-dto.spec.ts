import { describe, expect, it } from 'vitest';
import { CreateArticleSchema } from './create-article.dto.js';
import { QueryArticlesSchema } from './query-articles.dto.js';
import { QueryFeedSchema } from './query-feed.dto.js';
import { UpdateArticleSchema } from './update-article.dto.js';

describe('Articles DTOs', () => {
  describe('CreateArticleSchema', () => {
    it('accepts valid payload with and without tagList', () => {
      expect(
        CreateArticleSchema.safeParse({
          article: {
            title: 'Title',
            description: 'Desc',
            body: 'Body',
            tagList: ['nestjs', 'zod'],
          },
        }).success,
      ).toBe(true);

      expect(
        CreateArticleSchema.safeParse({
          article: {
            title: 'Title',
            description: 'Desc',
            body: 'Body',
          },
        }).success,
      ).toBe(true);
    });

    it('rejects missing or whitespace-only required fields', () => {
      expect(
        CreateArticleSchema.safeParse({
          article: { title: '   ', description: 'Desc', body: 'Body' },
        }).success,
      ).toBe(false);

      expect(
        CreateArticleSchema.safeParse({
          article: { title: 'Title', description: 'Desc' },
        }).success,
      ).toBe(false);
    });
  });

  describe('UpdateArticleSchema', () => {
    it('accepts partial valid update', () => {
      expect(
        UpdateArticleSchema.safeParse({
          article: { title: 'New Title' },
        }).success,
      ).toBe(true);
    });

    it('rejects empty update object with articles.emptyUpdate', () => {
      const res = UpdateArticleSchema.safeParse({ article: {} });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toBe('articles.emptyUpdate');
      }
    });

    it('rejects empty string fields', () => {
      expect(
        UpdateArticleSchema.safeParse({
          article: { title: '' },
        }).success,
      ).toBe(false);
    });
  });

  describe('QueryArticlesSchema & QueryFeedSchema', () => {
    it('applies default limit=20 and offset=0', () => {
      expect(QueryArticlesSchema.parse({})).toEqual({ limit: 20, offset: 0 });
      expect(QueryFeedSchema.parse({})).toEqual({ limit: 20, offset: 0 });
    });

    it('rejects limit=0, limit=101, and offset=-1', () => {
      expect(QueryArticlesSchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(QueryArticlesSchema.safeParse({ limit: 101 }).success).toBe(false);
      expect(QueryArticlesSchema.safeParse({ offset: -1 }).success).toBe(false);

      expect(QueryFeedSchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(QueryFeedSchema.safeParse({ limit: 101 }).success).toBe(false);
      expect(QueryFeedSchema.safeParse({ offset: -1 }).success).toBe(false);
    });
  });
});
