import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ARTICLE_LIMITS } from './create-article.dto.js';

export const UpdateArticleBodySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(ARTICLE_LIMITS.TITLE_MAX)
      .optional()
      .meta({
        description: 'Updated article title',
        example: 'Did you train your dragon?',
      }),
    description: z
      .string()
      .trim()
      .min(1)
      .max(ARTICLE_LIMITS.DESCRIPTION_MAX)
      .optional()
      .meta({
        description: 'Updated description',
        example: 'Updated description',
      }),
    body: z
      .string()
      .trim()
      .min(1)
      .max(ARTICLE_LIMITS.BODY_MAX)
      .optional()
      .meta({
        description: 'Updated body',
        example: 'Updated body content',
      }),
    tagList: z
      .array(z.string().trim().min(1).max(ARTICLE_LIMITS.TAG_MAX))
      .max(ARTICLE_LIMITS.TAG_LIST_MAX)
      .optional()
      .meta({
        description: 'Updated list of tags',
        example: ['dragons', 'training'],
      }),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.body !== undefined ||
      data.tagList !== undefined,
    { message: 'articles.emptyUpdate' },
  );

export const UpdateArticleSchema = z
  .object({
    article: UpdateArticleBodySchema,
  })
  .strict();

export class UpdateArticleDto extends createZodDto(UpdateArticleSchema) {}
