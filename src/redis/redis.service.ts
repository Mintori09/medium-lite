import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject('REDIS_CLIENT') private readonly client: Redis,
    @Optional() private readonly logger?: Logger,
  ) {}

  onModuleInit() {
    this.client.on('connect', () => {
      this.logger?.log('Successfully connected to Redis');
    });

    this.client.on('error', (err) => {
      this.logger?.error('Redis connection error:', err);
    });
  }

  async onModuleDestroy() {
    this.logger?.log('Closing Redis connection...');
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    ttlInSeconds?: number,
  ): Promise<'OK' | null> {
    if (ttlInSeconds) {
      return this.client.set(key, value, 'EX', ttlInSeconds);
    }
    return this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async setJson<T>(
    key: string,
    data: T,
    ttlInSeconds?: number,
  ): Promise<'OK' | null> {
    const serialized = JSON.stringify(data);
    return this.set(key, serialized, ttlInSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  getClient(): Redis {
    return this.client;
  }
}
