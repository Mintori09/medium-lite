import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersController } from './users.controller.js';
import type { UsersService } from './users.service.js';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    updateUser: ReturnType<typeof vi.fn>;
  };

  const mockUserResponse = {
    user: {
      id: 'u1',
      email: 'a@b.com',
      username: 'alice',
      bio: 'hi',
      image: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(() => {
    usersService = {
      updateUser: vi.fn().mockResolvedValue(mockUserResponse),
    };
    controller = new UsersController(usersService as unknown as UsersService);
  });

  it('updateMe should delegate to usersService.updateUser', async () => {
    const dto = { bio: 'hi' };
    const res = await controller.updateMe('u1', dto, undefined);
    expect(usersService.updateUser).toHaveBeenCalledWith(
      'u1',
      dto,
      undefined,
    );
    expect(res).toEqual(mockUserResponse);
  });
});
