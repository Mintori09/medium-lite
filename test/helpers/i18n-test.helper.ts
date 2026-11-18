import enAuth from '../../src/i18n/en/auth.json' with { type: 'json' };
import viAuth from '../../src/i18n/vi/auth.json' with { type: 'json' };
import enValidation from '../../src/i18n/en/validation.json' with { type: 'json' };
import viValidation from '../../src/i18n/vi/validation.json' with { type: 'json' };
import enUsers from '../../src/i18n/en/users.json' with { type: 'json' };
import viUsers from '../../src/i18n/vi/users.json' with { type: 'json' };
import enProfiles from '../../src/i18n/en/profiles.json' with { type: 'json' };
import viProfiles from '../../src/i18n/vi/profiles.json' with { type: 'json' };
import enAttachments from '../../src/i18n/en/attachments.json' with { type: 'json' };
import viAttachments from '../../src/i18n/vi/attachments.json' with { type: 'json' };

export const catalogs = {
  en: {
    auth: enAuth,
    validation: enValidation,
    users: enUsers,
    profiles: enProfiles,
    attachments: enAttachments,
  },
  vi: {
    auth: viAuth,
    validation: viValidation,
    users: viUsers,
    profiles: viProfiles,
    attachments: viAttachments,
  },
} as const;

export type SupportedLang = 'en' | 'vi';
export type AuthMessageKey = `auth.${keyof typeof enAuth}`;
export type ValidationMessageKey = `validation.${keyof typeof enValidation}`;
export type UsersMessageKey = `users.${keyof typeof enUsers}`;
export type ProfilesMessageKey = `profiles.${keyof typeof enProfiles}`;
export type AttachmentsMessageKey = `attachments.${keyof typeof enAttachments}`;
export type MessageKey =
  | AuthMessageKey
  | ValidationMessageKey
  | UsersMessageKey
  | ProfilesMessageKey
  | AttachmentsMessageKey;

/**
 * Lấy chuỗi thông điệp dịch từ i18n catalog, hỗ trợ nội suy tham số ({field}, {minimum}, v.v.)
 */
export function getI18n(
  lang: SupportedLang,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const [namespace, msgKey] = key.split('.') as [
    'auth' | 'validation' | 'users' | 'profiles' | 'attachments',
    string,
  ];

  const catalog = catalogs[lang]?.[namespace] as Record<string, string>;
  let text = catalog?.[msgKey] ?? key;

  if (params) {
    for (const [pKey, pVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
    }
  }

  return text;
}
