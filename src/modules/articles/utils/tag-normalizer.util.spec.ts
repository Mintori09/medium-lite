import { describe, expect, it } from 'vitest';
import { normalizeTagNames } from './tag-normalizer.util.js';

describe('normalizeTagNames', () => {
  it('returns empty array for undefined or empty input', () => {
    expect(normalizeTagNames(undefined)).toEqual([]);
    expect(normalizeTagNames([])).toEqual([]);
  });

  it('trims, lowercases, deduplicates, filters empty strings, and sorts', () => {
    expect(
      normalizeTagNames(['  ReactJS ', 'angularjs', 'reactjs', '  ', 'Dragons']),
    ).toEqual(['angularjs', 'dragons', 'reactjs']);
  });
});
