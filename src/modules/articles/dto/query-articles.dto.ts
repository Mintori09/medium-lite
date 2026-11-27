import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGE_OFFSET,
  MAX_PAGE_LIMIT,
} from '../../../common/constants/pagination.constants.js';

export const QueryArticlesSchema = z.object({
  tag: z.string().trim().min(1).optional().meta({
    description: 'Filter by tag name',
    example: 'angularjs',
  }),
  author: z.string().trim().min(1).optional().meta({
    description: 'Filter by author username',
    example: 'jake',
  }),
  favorited: z.string().trim().min(1).optional().meta({
    description: 'Filter by username who favorited the article',
    example: 'jake',
  }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_LIMIT)
    .default(DEFAULT_PAGE_LIMIT)
    .meta({
      description: 'Number of articles to return',
      example: 20,
    }),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(DEFAULT_PAGE_OFFSET)
    .meta({
      description: 'Number of articles to skip',
      example: 0,
    }),
});

export class QueryArticlesDto extends createZodDto(QueryArticlesSchema) {}
