export function normalizeTagNames(tags?: string[]): string[] {
  if (!tags || tags.length === 0) {
    return [];
  }

  const unique = new Set<string>();
  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase();
    if (normalized.length > 0) {
      unique.add(normalized);
    }
  }

  return Array.from(unique).sort();
}
