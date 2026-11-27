import { randomBytes } from 'node:crypto';

export function generateArticleSlug(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const suffix = randomBytes(3).toString('hex');
  return base ? `${base}-${suffix}` : `article-${suffix}`;
}
