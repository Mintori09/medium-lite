import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateArticleBodySchema = z
  .object({
    title: z.string().trim().min(1).meta({
      description: 'Article title',
      example: 'How to train your dragon',
    }),
    description: z.string().trim().min(1).meta({
      description: 'Short description of the article',
      example: 'Ever wonder how?',
    }),
    body: z.string().trim().min(1).meta({
      description: 'Main content of the article',
      example: 'You have to believe',
    }),
    tagList: z
      .array(z.string().trim().min(1))
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
