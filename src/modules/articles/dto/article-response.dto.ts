import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ArticleAuthorSchema = z.object({
  username: z.string(),
  bio: z.string().nullable(),
  image: z.string().nullable(),
  following: z.boolean(),
});

export const ArticleResponseItemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  body: z.string(),
  tagList: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  favorited: z.boolean(),
  favoritesCount: z.number().int(),
  author: ArticleAuthorSchema,
});

export const SingleArticleResponseSchema = z.object({
  article: ArticleResponseItemSchema,
});

export const MultipleArticlesResponseSchema = z.object({
  articles: z.array(ArticleResponseItemSchema),
  articlesCount: z.number().int(),
});

export class SingleArticleResponseDto extends createZodDto(
  SingleArticleResponseSchema,
) {}

export class MultipleArticlesResponseDto extends createZodDto(
  MultipleArticlesResponseSchema,
) {}
