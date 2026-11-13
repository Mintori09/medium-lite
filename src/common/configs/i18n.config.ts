import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nOptions,
  QueryResolver,
} from 'nestjs-i18n';

const baseDir = fileURLToPath(new URL('../..', import.meta.url));
const projectRoot = process.cwd();

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
  typesOutputPath: path.join(projectRoot, 'src/generated/i18n.generated.ts'),
  resolvers: [
    new QueryResolver(['lang', 'l']),
    new HeaderResolver(['x-custom-lang']),
    AcceptLanguageResolver,
  ],
};
