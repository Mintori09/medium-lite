import { Global, Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { redisConfig } from '../common/configs/redis.config.js';
import { RedisService } from './redis.service.js';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => new Redis(redisConfig),
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
