import { describe, expect, it } from 'vitest';
import { generateArticleSlug } from './article-slug.util.js';

describe('generateArticleSlug', () => {
  it('generates a slugified title with a 6-char hex suffix', () => {
    const slug = generateArticleSlug('How to train your dragon');
    expect(slug).toMatch(/^how-to-train-your-dragon-[a-f0-9]{6}$/);
  });

  it('produces unique slugs for identical titles', () => {
    const slug1 = generateArticleSlug('Same Title');
    const slug2 = generateArticleSlug('Same Title');
    expect(slug1).not.toBe(slug2);
  });

  it('falls back to article-<hex> when title has no alphanumeric chars', () => {
    const slug = generateArticleSlug('!!!');
    expect(slug).toMatch(/^article-[a-f0-9]{6}$/);
  });
});
