import type { core } from 'zod';

const ZOD_ISSUE_CODES = {
  INVALID_TYPE: 'invalid_type',
  INVALID_FORMAT: 'invalid_format',
  TOO_SMALL: 'too_small',
  TOO_BIG: 'too_big',
  UNRECOGNIZED_KEYS: 'unrecognized_keys',
  INVALID_VALUE: 'invalid_value',
  CUSTOM: 'custom',
} as const;

export type TranslationFn = (
  key: `validation.${string}`,
  args?: Record<string, unknown>,
) => string;

function valueAtPath(value: unknown, path: core.$ZodIssue['path']): unknown {
  return path.reduce<unknown>(
    (acc, key) =>
      acc == null ? undefined : (acc as Record<PropertyKey, unknown>)[key],
    value,
  );
}

export function translateZodIssue(
  issue: core.$ZodIssue,
  value: unknown,
  t: TranslationFn,
): string {
  const field = issue.path.length > 0 ? issue.path.join('.') : 'value';

  switch (issue.code) {
    case ZOD_ISSUE_CODES.INVALID_TYPE:
      return valueAtPath(value, issue.path) === undefined
        ? t('validation.REQUIRED', { field })
        : t('validation.INVALID_TYPE', { field });
    case ZOD_ISSUE_CODES.INVALID_FORMAT:
      if (issue.format === 'email')
        return t('validation.INVALID_EMAIL', { field });
      if (issue.format === 'url') return t('validation.INVALID_URL', { field });
      return t('validation.INVALID_FORMAT', { field });
    case ZOD_ISSUE_CODES.TOO_SMALL:
      return t('validation.TOO_SHORT', { field, minimum: issue.minimum });
    case ZOD_ISSUE_CODES.TOO_BIG:
      return t('validation.TOO_LONG', { field, maximum: issue.maximum });
    case ZOD_ISSUE_CODES.UNRECOGNIZED_KEYS: {
      const keys = (issue as { keys?: string[] }).keys?.join(', ') ?? '';
      return t('validation.UNRECOGNIZED_KEYS', { keys });
    }
    case ZOD_ISSUE_CODES.INVALID_VALUE:
      return t('validation.INVALID_VALUE', { field });
    case ZOD_ISSUE_CODES.CUSTOM: {
      const params = (issue as { params?: Record<string, unknown> }).params;
      if (params) {
        const { i18nKey, ...restParams } = params;
        if (typeof i18nKey === 'string' && i18nKey.startsWith('validation.')) {
          return t(i18nKey as `validation.${string}`, { field, ...restParams });
        }
      }
      return t('validation.INVALID', { field });
    }
    default:
      return t('validation.INVALID', { field });
  }
}

export function translateZodIssues(
  issues: core.$ZodIssue[],
  value: unknown,
  t: TranslationFn,
): string[] {
  return issues.map((issue) => translateZodIssue(issue, value, t));
}
