import enAuth from '../../src/i18n/en/auth.json' with { type: 'json' };
import viAuth from '../../src/i18n/vi/auth.json' with { type: 'json' };
import enValidation from '../../src/i18n/en/validation.json' with { type: 'json' };
import viValidation from '../../src/i18n/vi/validation.json' with { type: 'json' };

export const catalogs = {
  en: {
    auth: enAuth,
    validation: enValidation,
  },
  vi: {
    auth: viAuth,
    validation: viValidation,
  },
} as const;

export type SupportedLang = 'en' | 'vi';
export type AuthMessageKey = `auth.${keyof typeof enAuth}`;
export type ValidationMessageKey = `validation.${keyof typeof enValidation}`;
export type MessageKey = AuthMessageKey | ValidationMessageKey;

/**
 * Lấy chuỗi thông điệp dịch từ i18n catalog, hỗ trợ nội suy tham số ({field}, {minimum}, v.v.)
 */
export function getI18n(
  lang: SupportedLang,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const [namespace, msgKey] = key.split('.') as ['auth' | 'validation', string];

  const catalog = catalogs[lang]?.[namespace] as Record<string, string>;
  let text = catalog?.[msgKey] ?? key;

  if (params) {
    for (const [pKey, pVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
    }
  }

  return text;
}
