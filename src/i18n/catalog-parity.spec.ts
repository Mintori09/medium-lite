import { describe, expect, it } from 'vitest';
import enAuth from './en/auth.json';
import viAuth from './vi/auth.json';
import enValidation from './en/validation.json';
import viValidation from './vi/validation.json';

type Catalog = Record<string, unknown>;

function flattenKeys(value: Catalog, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child !== null && typeof child === 'object' && !Array.isArray(child)
      ? flattenKeys(child as Catalog, path)
      : [path];
  });
}

const catalogs: Array<[string, Catalog, Catalog]> = [
  ['auth', enAuth, viAuth],
  ['validation', enValidation, viValidation],
];

describe('i18n catalogs', () => {
  it.each(catalogs)(
    '%s should have matching keys between en and vi',
    (_name, en, vi) => {
      expect(flattenKeys(en).sort()).toEqual(flattenKeys(vi).sort());
    },
  );
});
