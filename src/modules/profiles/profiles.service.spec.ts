import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { I18nService } from 'nestjs-i18n';
import type { I18nTranslations } from '../../generated/i18n.generated.js';
import { db } from '../../common/database/db.js';
import type { UsersService, UserRecord } from '../users/users.service.js';
import { ProfilesService } from './profiles.service.js';

describe('ProfilesService', () => {
  let service: ProfilesService;
  const targetUser: UserRecord = {
    id: 'user-2',
    email: 'target@example.com',
    username: 'target_user',
    passwordHash: 'hashed',
    bio: 'Target bio',
    image: '/public/uploads/avatars/avatar.png',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findByUsername: vi.fn(),
  } as unknown as UsersService;

  const mockI18n = {
    translate: vi.fn((key: string) => key),
  } as unknown as I18nService<I18nTranslations>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProfilesService(mockUsersService, mockI18n);
  });

  it('should return profile with following=false for anonymous user', async () => {
    vi.mocked(mockUsersService.findByUsername).mockResolvedValue(targetUser);

    const res = await service.getProfile('target_user');

    expect(res).toEqual({
      profile: {
        username: 'target_user',
        bio: 'Target bio',
        image: '/public/uploads/avatars/avatar.png',
        following: false,
      },
    });
  });

  it('should return following=true when follow record exists', async () => {
    vi.mocked(mockUsersService.findByUsername).mockResolvedValue(targetUser);
    vi.spyOn(db.orm.public.Follow, 'first').mockResolvedValue({
      id: 'follow-1',
      followerId: 'user-1',
      followingId: 'user-2',
      createdAt: new Date(),
    });

    const res = await service.getProfile('target_user', 'user-1');
    expect(res.profile.following).toBe(true);
  });

  it('should throw NotFoundException when target user does not exist', async () => {
    vi.mocked(mockUsersService.findByUsername).mockResolvedValue(null);

    await expect(service.getProfile('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException when trying to follow yourself', async () => {
    vi.mocked(mockUsersService.findByUsername).mockResolvedValue(targetUser);

    await expect(service.followUser('target_user', 'user-2')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should follow user idempotently using createAndCount with onConflict skip', async () => {
    vi.mocked(mockUsersService.findByUsername).mockResolvedValue(targetUser);
    const createSpy = vi
      .spyOn(db.orm.public.Follow, 'createAndCount')
      .mockResolvedValue(0);

    const res = await service.followUser('target_user', 'user-1');

    expect(createSpy).toHaveBeenCalledWith(
      [{ followerId: 'user-1', followingId: 'user-2' }],
      { onConflict: 'skip', conflictOn: ['followerId', 'followingId'] },
    );
    expect(res.profile.following).toBe(true);
  });

  it('should unfollow user idempotently using deleteAndCount', async () => {
    vi.mocked(mockUsersService.findByUsername).mockResolvedValue(targetUser);
    const deleteMock = vi.fn().mockResolvedValue(0);
    vi.spyOn(db.orm.public.Follow, 'where').mockReturnValue({
      deleteAndCount: deleteMock,
    } as unknown as ReturnType<typeof db.orm.public.Follow.where>);

    const res = await service.unfollowUser('target_user', 'user-1');

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(res.profile.following).toBe(false);
  });

  it('should throw NotFoundException when following a non-existent user', async () => {
    vi.mocked(mockUsersService.findByUsername).mockResolvedValue(null);

    await expect(service.followUser('missing', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException when unfollowing a non-existent user', async () => {
    vi.mocked(mockUsersService.findByUsername).mockResolvedValue(null);

    await expect(service.unfollowUser('missing', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException when getting profile of an inactive user', async () => {
    vi.mocked(mockUsersService.findByUsername).mockResolvedValue({
      ...targetUser,
      isActive: false,
    });

    await expect(service.getProfile('target_user', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException when following an inactive user', async () => {
    vi.mocked(mockUsersService.findByUsername).mockResolvedValue({
      ...targetUser,
      isActive: false,
    });

    await expect(service.followUser('target_user', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException when unfollowing an inactive user', async () => {
    vi.mocked(mockUsersService.findByUsername).mockResolvedValue({
      ...targetUser,
      isActive: false,
    });

    await expect(
      service.unfollowUser('target_user', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
