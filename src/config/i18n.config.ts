import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nOptions,
  QueryResolver,
} from 'nestjs-i18n';

const baseDir = fileURLToPath(new URL('..', import.meta.url));

export const i18nConfig: I18nOptions = {
  fallbackLanguage: 'en',
  fallbacks: {
    'en-*': 'en',
    'vi-*': 'vi',
  },
  loaderOptions: {
    path: path.join(baseDir, 'i18n/'),
    watch: true,
  },
  resolvers: [
    new QueryResolver(['lang', 'l']),
    new HeaderResolver(['x-custom-lang']),
    AcceptLanguageResolver,
  ],
};
