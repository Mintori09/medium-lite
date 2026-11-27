import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CommentAuthorSchema = z.object({
  username: z.string(),
  bio: z.string().nullable(),
  image: z.string().nullable(),
  following: z.boolean(),
});

export const CommentResponseSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  author: CommentAuthorSchema,
});

export const SingleCommentResponseSchema = z.object({
  comment: CommentResponseSchema,
});

export const MultipleCommentsResponseSchema = z.object({
  comments: z.array(CommentResponseSchema),
});

export class CommentAuthorDto extends createZodDto(CommentAuthorSchema) {}

export class CommentResponseDto extends createZodDto(CommentResponseSchema) {}

export class SingleCommentResponseDto extends createZodDto(
  SingleCommentResponseSchema,
) {}

export class MultipleCommentsResponseDto extends createZodDto(
  MultipleCommentsResponseSchema,
) {}
