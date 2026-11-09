import { Module } from '@nestjs/common';
import { I18nModule } from 'nestjs-i18n';
import { i18nConfig } from './config/i18n.config.js';
import { HelloModule } from './modules/hello/hello.module.js';

@Module({
  imports: [I18nModule.forRoot(i18nConfig), HelloModule],
})
export class AppModule {}
