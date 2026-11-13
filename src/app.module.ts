import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import { I18nModule } from 'nestjs-i18n';
import { i18nConfig } from './common/configs/i18n.config.js';
import { ZodI18nValidationPipe } from './common/pipes/zod-i18n-validation.pipe.js';
import { RedisModule } from './redis/redis.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';

const THROTTLE_TTL_MS = 60000;
const THROTTLE_LIMIT = 30;

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: THROTTLE_TTL_MS,
        limit: THROTTLE_LIMIT,
      },
    ]),
    I18nModule.forRoot(i18nConfig),
    RedisModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodI18nValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule {}
