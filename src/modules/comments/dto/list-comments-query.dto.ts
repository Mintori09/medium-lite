import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const DEFAULT_COMMENTS_LIMIT = 50;
export const MAX_COMMENTS_LIMIT = 100;

export const ListCommentsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_COMMENTS_LIMIT)
    .default(DEFAULT_COMMENTS_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

export class ListCommentsQueryDto extends createZodDto(
  ListCommentsQuerySchema,
) {}
