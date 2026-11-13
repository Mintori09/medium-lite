import { Module } from '@nestjs/common';
import { I18nModule } from 'nestjs-i18n';
import { i18nConfig } from './common/configs/i18n.config.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [I18nModule.forRoot(i18nConfig), RedisModule],
})
export class AppModule {}
