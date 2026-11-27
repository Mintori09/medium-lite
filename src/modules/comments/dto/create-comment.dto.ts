import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const COMMENT_BODY_MAX_LENGTH = 16_000;

export const CreateCommentSchema = z
  .object({
    comment: z
      .object({
        body: z
          .string()
          .trim()
          .min(1, 'validation.REQUIRED')
          .max(COMMENT_BODY_MAX_LENGTH, 'comments.bodyTooLong'),
      })
      .strict(),
  })
  .strict();

export class CreateCommentDto extends createZodDto(CreateCommentSchema) {}
