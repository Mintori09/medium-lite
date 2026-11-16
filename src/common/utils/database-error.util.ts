const PG_UNIQUE_VIOLATION = '23505';

interface PgErrorShape {
  sqlState?: string;
  constraint?: string;
  cause?: unknown;
}

/**
 * Extracts PostgreSQL unique-violation metadata (`sqlState === '23505'`)
 */
export function getUniqueViolationConstraint(error: unknown): string | null {
  let current: unknown = error;
  for (
    let depth = 0;
    depth < 4 && current && typeof current === 'object';
    depth++
  ) {
    const candidate = current as PgErrorShape;
    if (candidate.sqlState === PG_UNIQUE_VIOLATION) {
      return candidate.constraint ?? '';
    }
    current = candidate.cause;
  }
  return null;
}
