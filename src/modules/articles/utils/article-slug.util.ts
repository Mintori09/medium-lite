import { randomBytes } from 'node:crypto';

export function generateArticleSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const suffix = randomBytes(3).toString('hex');
  return base ? `${base}-${suffix}` : `article-${suffix}`;
}
