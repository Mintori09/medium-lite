import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';

describe('CommentsController', () => {
  let controller: CommentsController;

  const mockCommentsService = {
    create: vi.fn(),
    findAll: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [{ provide: CommentsService, useValue: mockCommentsService }],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
  });

  it('should delegate create to CommentsService', async () => {
    const dto = { comment: { body: 'Hello' } };
    const expected = { comment: { id: 'c-1', body: 'Hello' } };
    mockCommentsService.create.mockResolvedValue(expected);

    const result = await controller.create('slug-1', 'user-1', dto);

    expect(mockCommentsService.create).toHaveBeenCalledWith(
      'slug-1',
      'user-1',
      dto,
    );
    expect(result).toBe(expected);
  });

  it('should delegate findAll to CommentsService', async () => {
    const expected = { comments: [] };
    const query = { limit: 20, offset: 0 };
    mockCommentsService.findAll.mockResolvedValue(expected);

    const result = await controller.findAll('slug-1', query, 'user-1');

    expect(mockCommentsService.findAll).toHaveBeenCalledWith(
      'slug-1',
      'user-1',
      query,
    );
    expect(result).toBe(expected);
  });

  it('should delegate remove to CommentsService', async () => {
    mockCommentsService.remove.mockResolvedValue(undefined);

    await controller.remove('slug-1', 'comment-1', 'user-1');

    expect(mockCommentsService.remove).toHaveBeenCalledWith(
      'slug-1',
      'comment-1',
      'user-1',
    );
  });
});
