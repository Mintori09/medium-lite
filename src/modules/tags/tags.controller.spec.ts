import { describe, expect, it, vi } from 'vitest';
import { TagsController } from './tags.controller.js';
import type { TagsService } from './tags.service.js';

describe('TagsController', () => {
  it('delegates findAll to TagsService', async () => {
    const mockService = {
      findAll: vi.fn().mockResolvedValue({ tags: ['nestjs'] }),
    } as unknown as TagsService;

    const controller = new TagsController(mockService);
    const result = await controller.findAll();

    expect(mockService.findAll).toHaveBeenCalledOnce();
    expect(result).toEqual({ tags: ['nestjs'] });
  });
});
