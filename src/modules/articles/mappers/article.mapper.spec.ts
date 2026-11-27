import { describe, expect, it } from 'vitest';
import {
  mapArticleToResponse,
  mapMultipleArticlesResponse,
  mapSingleArticleResponse,
  type ArticleEnrichmentMaps,
  type ArticleRecordWithAuthor,
} from './article.mapper.js';

describe('article.mapper', () => {
  const now = new Date('2026-11-23T07:00:00.000Z');

  const baseArticle: ArticleRecordWithAuthor = {
    id: 'article-1',
    slug: 'how-to-train-your-dragon-a1b2c3',
    title: 'How to train your dragon',
    description: 'Ever wonder how?',
    body: 'You have to believe',
    favoritesCount: 3,
    createdAt: now,
    updatedAt: now,
    author: {
      id: 'author-1',
      username: 'jake',
      bio: 'I work at statefarm',
      image: 'https://example.com/avatar.png',
    },
  };

  const baseMaps: ArticleEnrichmentMaps = {
    tagsByArticleId: new Map([['article-1', ['angularjs', 'dragons']]]),
    favoritedArticleIds: new Set(['article-1']),
    followingAuthorIds: new Set(['author-1']),
  };

  it('maps article record and enrichment maps to response format', () => {
    expect(mapArticleToResponse(baseArticle, baseMaps)).toEqual({
      slug: 'how-to-train-your-dragon-a1b2c3',
      title: 'How to train your dragon',
      description: 'Ever wonder how?',
      body: 'You have to believe',
      tagList: ['angularjs', 'dragons'],
      createdAt: '2026-11-23T07:00:00.000Z',
      updatedAt: '2026-11-23T07:00:00.000Z',
      favorited: true,
      favoritesCount: 3,
      author: {
        username: 'jake',
        bio: 'I work at statefarm',
        image: 'https://example.com/avatar.png',
        following: true,
      },
    });
  });

  it('falls back to empty tagList and null bio/image when absent', () => {
    const emptyMaps: ArticleEnrichmentMaps = {
      tagsByArticleId: new Map(),
      favoritedArticleIds: new Set(),
      followingAuthorIds: new Set(),
    };
    const articleNoProfile: ArticleRecordWithAuthor = {
      ...baseArticle,
      author: {
        id: 'author-1',
        username: 'jake',
        bio: null,
        image: null,
      },
    };

    const result = mapArticleToResponse(articleNoProfile, emptyMaps);
    expect(result.tagList).toEqual([]);
    expect(result.favorited).toBe(false);
    expect(result.author).toEqual({
      username: 'jake',
      bio: null,
      image: null,
      following: false,
    });
  });

  it('wraps single article response', () => {
    const result = mapSingleArticleResponse(baseArticle, baseMaps);
    expect(result.article.slug).toBe(baseArticle.slug);
  });

  it('wraps multiple articles response with count', () => {
    const result = mapMultipleArticlesResponse([baseArticle], 10, baseMaps);
    expect(result.articles).toHaveLength(1);
    expect(result.articlesCount).toBe(10);
  });
});
