import type {
  MultipleArticlesResponseDto,
  SingleArticleResponseDto,
} from '../dto/article-response.dto.js';

export interface ArticleRecordWithAuthor {
  id: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  favoritesCount: number;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    username: string;
    bio: string | null;
    image: string | null;
  };
}

export interface ArticleEnrichmentMaps {
  tagsByArticleId: Map<string, string[]>;
  favoritedArticleIds: Set<string>;
  followingAuthorIds: Set<string>;
}

export function mapArticleToResponse(
  article: ArticleRecordWithAuthor,
  maps: ArticleEnrichmentMaps,
): SingleArticleResponseDto['article'] {
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    body: article.body,
    tagList: maps.tagsByArticleId.get(article.id) ?? [],
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    favorited: maps.favoritedArticleIds.has(article.id),
    favoritesCount: article.favoritesCount,
    author: {
      username: article.author.username,
      bio: article.author.bio ?? null,
      image: article.author.image ?? null,
      following: maps.followingAuthorIds.has(article.author.id),
    },
  };
}

export function mapSingleArticleResponse(
  article: ArticleRecordWithAuthor,
  maps: ArticleEnrichmentMaps,
): SingleArticleResponseDto {
  return {
    article: mapArticleToResponse(article, maps),
  };
}

export function mapMultipleArticlesResponse(
  articles: ArticleRecordWithAuthor[],
  articlesCount: number,
  maps: ArticleEnrichmentMaps,
): MultipleArticlesResponseDto {
  return {
    articles: articles.map((article) => mapArticleToResponse(article, maps)),
    articlesCount,
  };
}
