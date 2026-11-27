import { describe, expect, it } from 'vitest';
import { parseDurationToSeconds } from './duration.util.js';

describe('parseDurationToSeconds', () => {
  it('parses numeric durations as seconds', () => {
    expect(parseDurationToSeconds(900)).toBe(900);
    expect(parseDurationToSeconds(60.8)).toBe(60);
  });

  it('parses string durations with explicit units (case-insensitive, trimmed)', () => {
    expect(parseDurationToSeconds('15m')).toBe(900);
    expect(parseDurationToSeconds(' 15m ')).toBe(900);
    expect(parseDurationToSeconds('15M')).toBe(900);
    expect(parseDurationToSeconds('7d')).toBe(7 * 24 * 60 * 60);
    expect(parseDurationToSeconds('30d')).toBe(30 * 24 * 60 * 60);
    expect(parseDurationToSeconds('2h')).toBe(7200);
    expect(parseDurationToSeconds('45s')).toBe(45);
    expect(parseDurationToSeconds('5000ms')).toBe(5);
  });

  it('throws on invalid, unitless, empty, or non-finite durations', () => {
    expect(() => parseDurationToSeconds(0)).toThrow();
    expect(() => parseDurationToSeconds(-10)).toThrow();
    expect(() => parseDurationToSeconds(Number.NaN)).toThrow();
    expect(() => parseDurationToSeconds(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => parseDurationToSeconds('')).toThrow();
    expect(() => parseDurationToSeconds('120')).toThrow();
    expect(() => parseDurationToSeconds('invalid')).toThrow();
  });
});
