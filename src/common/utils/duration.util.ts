const DURATION_UNITS_IN_SECONDS: Record<string, number> = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
  w: 7 * 24 * 60 * 60,
  y: 365.25 * 24 * 60 * 60,
};

export function parseDurationToSeconds(expiresIn: string | number): number {
  if (typeof expiresIn === 'number') {
    if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw new Error(`Invalid numeric duration: ${expiresIn}`);
    }
    return Math.max(1, Math.floor(expiresIn));
  }

  const trimmed = expiresIn.trim();
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w|y)$/i.exec(trimmed);
  if (!match) {
    throw new Error(
      `Invalid duration format: "${expiresIn}". Expected a number of seconds or a string with unit (ms, s, m, h, d, w, y).`,
    );
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = DURATION_UNITS_IN_SECONDS[unit];

  if (!Number.isFinite(value) || value <= 0 || multiplier === undefined) {
    throw new Error(`Invalid duration value: "${expiresIn}"`);
  }

  return Math.max(1, Math.floor(value * multiplier));
}
