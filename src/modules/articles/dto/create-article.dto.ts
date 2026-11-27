import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ARTICLE_LIMITS = {
  TITLE_MAX: 255,
  DESCRIPTION_MAX: 500,
  BODY_MAX: 50000,
  TAG_MAX: 50,
  TAG_LIST_MAX: 20,
} as const;

export const CreateArticleBodySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(ARTICLE_LIMITS.TITLE_MAX)
      .meta({
        description: 'Article title',
        example: 'How to train your dragon',
      }),
    description: z
      .string()
      .trim()
      .min(1)
      .max(ARTICLE_LIMITS.DESCRIPTION_MAX)
      .meta({
        description: 'Short description of the article',
        example: 'Ever wonder how?',
      }),
    body: z
      .string()
      .trim()
      .min(1)
      .max(ARTICLE_LIMITS.BODY_MAX)
      .meta({
        description: 'Main content of the article',
        example: 'You have to believe',
      }),
    tagList: z
      .array(z.string().trim().min(1).max(ARTICLE_LIMITS.TAG_MAX))
      .max(ARTICLE_LIMITS.TAG_LIST_MAX)
      .optional()
      .meta({
        description: 'List of tags for the article',
        example: ['reactjs', 'angularjs', 'dragons'],
      }),
  })
  .strict();

export const CreateArticleSchema = z
  .object({
    article: CreateArticleBodySchema,
  })
  .strict();

export class CreateArticleDto extends createZodDto(CreateArticleSchema) {}
