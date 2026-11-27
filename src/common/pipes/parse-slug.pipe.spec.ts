import { BadRequestException } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ParseSlugPipe } from './parse-slug.pipe.js';

describe('ParseSlugPipe', () => {
  const pipe = new ParseSlugPipe();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return valid slug unchanged', () => {
    expect(pipe.transform('valid-article_slug-123')).toBe(
      'valid-article_slug-123',
    );
  });

  it('should throw BadRequestException with fallback message when I18nContext is absent', () => {
    vi.spyOn(I18nContext, 'current').mockReturnValue(undefined);

    expect(() => pipe.transform('invalid slug!')).toThrow(BadRequestException);
    expect(() => pipe.transform('invalid slug!')).toThrow(
      'Invalid article slug',
    );
  });

  it('should throw BadRequestException with translated message when I18nContext is present', () => {
    const mockT = vi.fn().mockReturnValue('Slug bài viết không hợp lệ');
    vi.spyOn(I18nContext, 'current').mockReturnValue({
      t: mockT,
    } as never);

    expect(() => pipe.transform('')).toThrow('Slug bài viết không hợp lệ');
    expect(mockT).toHaveBeenCalledWith('articles.invalidSlug');
  });
});
