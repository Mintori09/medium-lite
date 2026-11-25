import { describe, expect, it } from 'vitest';
import {
  COMMENT_BODY_MAX_LENGTH,
  CreateCommentSchema,
} from './create-comment.dto.js';
import {
  DEFAULT_COMMENTS_LIMIT,
  ListCommentsQuerySchema,
  MAX_COMMENTS_LIMIT,
} from './list-comments-query.dto.js';

describe('CreateCommentSchema', () => {
  it('should trim whitespace and accept a valid comment body', () => {
    const result = CreateCommentSchema.safeParse({
      comment: { body: '  Great article!  ' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.comment.body).toBe('Great article!');
    }
  });

  it('should reject empty or whitespace-only body', () => {
    const emptyResult = CreateCommentSchema.safeParse({
      comment: { body: '' },
    });
    const whitespaceResult = CreateCommentSchema.safeParse({
      comment: { body: '   \t\n  ' },
    });

    expect(emptyResult.success).toBe(false);
    expect(whitespaceResult.success).toBe(false);
  });

  it('should reject body exceeding max length', () => {
    const result = CreateCommentSchema.safeParse({
      comment: { body: 'a'.repeat(COMMENT_BODY_MAX_LENGTH + 1) },
    });

    expect(result.success).toBe(false);
  });

  it('should reject flat payload without comment wrapper', () => {
    const result = CreateCommentSchema.safeParse({
      body: 'Great article!',
    });

    expect(result.success).toBe(false);
  });
});

describe('ListCommentsQuerySchema', () => {
  it('should apply default limit and offset', () => {
    const result = ListCommentsQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(DEFAULT_COMMENTS_LIMIT);
      expect(result.data.offset).toBe(0);
    }
  });

  it('should reject limit exceeding max or negative offset', () => {
    expect(
      ListCommentsQuerySchema.safeParse({ limit: MAX_COMMENTS_LIMIT + 1 })
        .success,
    ).toBe(false);
    expect(
      ListCommentsQuerySchema.safeParse({ offset: -1 }).success,
    ).toBe(false);
  });
});
