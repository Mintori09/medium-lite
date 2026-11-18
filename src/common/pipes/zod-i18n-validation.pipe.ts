import { BadRequestException } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';
import { I18nContext } from 'nestjs-i18n';
import { ZodError } from 'zod';
import type { I18nTranslations } from '../../generated/i18n.generated.js';
import { translateZodIssues, type TranslationFn } from './zod-i18n-issue.js';

export const ZodI18nValidationPipe = createZodValidationPipe({
  createValidationException: (error: unknown) => {
    if (error instanceof ZodError) {
      const i18n = I18nContext.current<I18nTranslations>();
      const t: TranslationFn = (key, args) =>
        i18n ? String(i18n.t(key as never, { args } as never)) : key;

      const messages = translateZodIssues(error.issues, undefined, t);

      return new BadRequestException({
        statusCode: 400,
        message: messages,
        error: 'Bad Request',
      });
    }

    return new BadRequestException(error);
  },
});
