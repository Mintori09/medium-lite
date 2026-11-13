import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { RedisService } from './redis.service.js';

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: Partial<Redis>;
  let mockLogger: Partial<Logger>;
  let eventHandlers: Record<string, (...args: unknown[]) => void>;

  beforeEach(() => {
    eventHandlers = {};
    mockClient = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        eventHandlers[event] = handler;
        return mockClient as Redis;
      }),
      quit: vi.fn().mockResolvedValue('OK'),
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
    };

    service = new RedisService(mockClient as Redis, mockLogger as Logger);
  });

  describe('onModuleInit', () => {
    it('should register connect and error handlers and log messages', () => {
      service.onModuleInit();

      expect(mockClient.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));

      // Trigger connect handler
      eventHandlers['connect']();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Successfully connected to Redis',
      );

      // Trigger error handler
      const testError = new Error('Connection refused');
      eventHandlers['error'](testError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Redis connection error:',
        testError,
      );
    });

    it('should handle events safely when logger is undefined', () => {
      const serviceWithoutLogger = new RedisService(mockClient as Redis);
      serviceWithoutLogger.onModuleInit();

      expect(() => {
        eventHandlers['connect']();
        eventHandlers['error'](new Error('err'));
      }).not.toThrow();
    });
  });

  describe('onModuleDestroy', () => {
    it('should log and quit client on destroy', async () => {
      await service.onModuleDestroy();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Closing Redis connection...',
      );
      expect(mockClient.quit).toHaveBeenCalled();
    });

    it('should quit client safely when logger is undefined', async () => {
      const serviceWithoutLogger = new RedisService(mockClient as Redis);
      await serviceWithoutLogger.onModuleDestroy();

      expect(mockClient.quit).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should call client.get and return result', async () => {
      vi.mocked(mockClient.get!).mockResolvedValue('test-val');

      const result = await service.get('my-key');
      expect(mockClient.get).toHaveBeenCalledWith('my-key');
      expect(result).toBe('test-val');
    });

    it('should return null when key does not exist', async () => {
      vi.mocked(mockClient.get!).mockResolvedValue(null);

      const result = await service.get('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should call client.set without ttl when not specified', async () => {
      vi.mocked(mockClient.set!).mockResolvedValue('OK');

      const result = await service.set('my-key', 'my-val');
      expect(mockClient.set).toHaveBeenCalledWith('my-key', 'my-val');
      expect(result).toBe('OK');
    });

    it('should call client.set with EX and ttl when specified', async () => {
      vi.mocked(mockClient.set!).mockResolvedValue('OK');

      const result = await service.set('my-key', 'my-val', 3600);
      expect(mockClient.set).toHaveBeenCalledWith(
        'my-key',
        'my-val',
        'EX',
        3600,
      );
      expect(result).toBe('OK');
    });
  });

  describe('del', () => {
    it('should call client.del and return number of deleted keys', async () => {
      vi.mocked(mockClient.del!).mockResolvedValue(1);

      const result = await service.del('my-key');
      expect(mockClient.del).toHaveBeenCalledWith('my-key');
      expect(result).toBe(1);
    });
  });

  describe('setJson', () => {
    it('should serialize object and call set without ttl', async () => {
      vi.mocked(mockClient.set!).mockResolvedValue('OK');

      const data = { id: 1, name: 'Alice' };
      const result = await service.setJson('json-key', data);

      expect(mockClient.set).toHaveBeenCalledWith(
        'json-key',
        JSON.stringify(data),
      );
      expect(result).toBe('OK');
    });

    it('should serialize object and call set with ttl', async () => {
      vi.mocked(mockClient.set!).mockResolvedValue('OK');

      const data = { id: 1, name: 'Alice' };
      const result = await service.setJson('json-key', data, 60);

      expect(mockClient.set).toHaveBeenCalledWith(
        'json-key',
        JSON.stringify(data),
        'EX',
        60,
      );
      expect(result).toBe('OK');
    });
  });

  describe('getJson', () => {
    it('should return null when raw value is null', async () => {
      vi.mocked(mockClient.get!).mockResolvedValue(null);

      const result = await service.getJson('empty-key');
      expect(result).toBeNull();
    });

    it('should parse and return object when valid json is stored', async () => {
      const data = { id: 1, name: 'Alice' };
      vi.mocked(mockClient.get!).mockResolvedValue(JSON.stringify(data));

      const result = await service.getJson<typeof data>('valid-key');
      expect(result).toEqual(data);
    });

    it('should return null when json parse throws error', async () => {
      vi.mocked(mockClient.get!).mockResolvedValue('invalid-json{{{');

      const result = await service.getJson('corrupted-key');
      expect(result).toBeNull();
    });
  });

  describe('getClient', () => {
    it('should return the underlying redis client', () => {
      expect(service.getClient()).toBe(mockClient);
    });
  });
});
