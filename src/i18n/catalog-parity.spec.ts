import { describe, expect, it } from 'vitest';
import enAuth from './en/auth.json';
import viAuth from './vi/auth.json';
import enValidation from './en/validation.json';
import viValidation from './vi/validation.json';
import enUsers from './en/users.json';
import viUsers from './vi/users.json';
import enProfiles from './en/profiles.json';
import viProfiles from './vi/profiles.json';
import enAttachments from './en/attachments.json';
import viAttachments from './vi/attachments.json';

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
  ['users', enUsers, viUsers],
  ['profiles', enProfiles, viProfiles],
  ['attachments', enAttachments, viAttachments],
];

describe('i18n catalogs', () => {
  it.each(catalogs)(
    '%s should have matching keys between en and vi',
    (_name, en, vi) => {
      expect(flattenKeys(en).sort()).toEqual(flattenKeys(vi).sort());
    },
  );
});
