import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { HelloResponseDto } from './dto/hello-response.dto.js';

@Injectable()
export class HelloService {
  constructor(private readonly i18n: I18nService) {}

  getHello(i18n?: I18nContext): HelloResponseDto {
    const lang = i18n?.lang || 'en';
    const message = this.i18n.t('app.hello', { lang });
    return {
      message,
      lang,
    };
  }
}
