import { describe, expect, it, vi } from 'vitest';
import { ArticlesController } from './articles.controller.js';
import type { ArticlesService } from './articles.service.js';

describe('ArticlesController', () => {
  const mockService = {
    findAll: vi.fn(),
    findFeed: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    favorite: vi.fn(),
    unfavorite: vi.fn(),
  } as unknown as ArticlesService;

  const controller = new ArticlesController(mockService);

  it('delegates findAll to service', async () => {
    const query = { limit: 20, offset: 0 };
    await controller.findAll(query, 'user-1');
    expect(mockService.findAll).toHaveBeenCalledWith(query, 'user-1');
  });

  it('delegates findFeed to service', async () => {
    const query = { limit: 10, offset: 0 };
    await controller.findFeed(query, 'user-1');
    expect(mockService.findFeed).toHaveBeenCalledWith('user-1', query);
  });

  it('delegates findBySlug to service', async () => {
    await controller.findBySlug('my-slug', 'user-1');
    expect(mockService.findBySlug).toHaveBeenCalledWith('my-slug', 'user-1');
  });

  it('delegates create to service', async () => {
    const dto = {
      article: { title: 'T', description: 'D', body: 'B' },
    };
    await controller.create('user-1', dto);
    expect(mockService.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('delegates update to service', async () => {
    const dto = { article: { title: 'New' } };
    await controller.update('my-slug', 'user-1', dto);
    expect(mockService.update).toHaveBeenCalledWith('my-slug', 'user-1', dto);
  });

  it('delegates remove to service', async () => {
    await controller.remove('my-slug', 'user-1');
    expect(mockService.remove).toHaveBeenCalledWith('my-slug', 'user-1');
  });

  it('delegates favorite to service', async () => {
    await controller.favorite('my-slug', 'user-1');
    expect(mockService.favorite).toHaveBeenCalledWith('my-slug', 'user-1');
  });

  it('delegates unfavorite to service', async () => {
    await controller.unfavorite('my-slug', 'user-1');
    expect(mockService.unfavorite).toHaveBeenCalledWith('my-slug', 'user-1');
  });
});
