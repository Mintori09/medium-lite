import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  QueryResolver,
} from 'nestjs-i18n';
import { createI18nOptions } from './i18n.config.js';

describe('createI18nOptions', () => {
  it('should enable watch and generate types in non-production environments', () => {
    const options = createI18nOptions({
      nodeEnv: 'development',
      cwd: '/tmp/app',
    });

    expect(options.fallbackLanguage).toBe('en');
    expect(options.loaderOptions.watch).toBe(true);
    expect(options.typesOutputPath).toBe(
      path.join('/tmp/app', 'src/generated/i18n.generated.ts'),
    );
  });

  it('should disable watch and skip type generation in production', () => {
    const options = createI18nOptions({ nodeEnv: 'production' });

    expect(options.loaderOptions.watch).toBe(false);
    expect(options.typesOutputPath).toBeUndefined();
  });

  it('should register resolvers in priority order: query > header > accept-language', () => {
    const options = createI18nOptions({ nodeEnv: 'development' });

    expect(options.resolvers).toHaveLength(3);
    expect(options.resolvers?.[0]).toBeInstanceOf(QueryResolver);
    expect(options.resolvers?.[1]).toBeInstanceOf(HeaderResolver);
    expect(options.resolvers?.[2]).toBe(AcceptLanguageResolver);
  });

  it('should use default environment and cwd when no arguments provided', () => {
    const options = createI18nOptions();
    expect(options.fallbackLanguage).toBe('en');
    expect(options.typesOutputPath).toContain(
      'src/generated/i18n.generated.ts',
    );
  });
});
