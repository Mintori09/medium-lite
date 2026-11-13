import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  QueryResolver,
  type I18nOptions,
} from 'nestjs-i18n';

const baseDir = fileURLToPath(new URL('../..', import.meta.url));

export interface CreateI18nOptionsInput {
  nodeEnv?: string;
  cwd?: string;
}

export function createI18nOptions({
  nodeEnv = process.env.NODE_ENV ?? 'development',
  cwd = process.cwd(),
}: CreateI18nOptionsInput = {}): I18nOptions {
  const isProduction = nodeEnv === 'production';

  const options: I18nOptions = {
    fallbackLanguage: 'en',
    fallbacks: { 'en-*': 'en', 'vi-*': 'vi' },
    loaderOptions: {
      path: path.join(baseDir, 'i18n/'),
      watch: !isProduction,
    },
    resolvers: [
      new QueryResolver(['lang', 'l']),
      new HeaderResolver(['x-custom-lang']),
      AcceptLanguageResolver,
    ],
  };

  if (!isProduction) {
    options.typesOutputPath = path.join(cwd, 'src/generated/i18n.generated.ts');
  }

  return options;
}

export const i18nConfig = createI18nOptions();
