import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import type { I18nTranslations } from '../../generated/i18n.generated.js';

const SLUG_REGEX = /^[a-zA-Z0-9_-]{1,200}$/;

export class ParseSlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !SLUG_REGEX.test(value)) {
      const i18n = I18nContext.current<I18nTranslations>();
      const message = i18n
        ? String(i18n.t('articles.invalidSlug' as never))
        : 'Invalid article slug';
      throw new BadRequestException(message);
    }
    return value;
  }
}
