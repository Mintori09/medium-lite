import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfilesController } from './profiles.controller.js';
import type { ProfilesService } from './profiles.service.js';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let profilesService: {
    getProfile: ReturnType<typeof vi.fn>;
    followUser: ReturnType<typeof vi.fn>;
    unfollowUser: ReturnType<typeof vi.fn>;
  };

  const mockProfileResponse = {
    profile: {
      username: 'alice',
      bio: 'Hello',
      image: null,
      following: false,
    },
  };

  beforeEach(() => {
    profilesService = {
      getProfile: vi.fn().mockResolvedValue(mockProfileResponse),
      followUser: vi.fn().mockResolvedValue({
        profile: { ...mockProfileResponse.profile, following: true },
      }),
      unfollowUser: vi.fn().mockResolvedValue(mockProfileResponse),
    };
    controller = new ProfilesController(
      profilesService as unknown as ProfilesService,
    );
  });

  it('getProfile should delegate to profilesService.getProfile', async () => {
    const res = await controller.getProfile('alice', 'u1');
    expect(profilesService.getProfile).toHaveBeenCalledWith('alice', 'u1');
    expect(res).toEqual(mockProfileResponse);
  });

  it('followUser should delegate to profilesService.followUser', async () => {
    const res = await controller.followUser('alice', 'u1');
    expect(profilesService.followUser).toHaveBeenCalledWith('alice', 'u1');
    expect(res.profile.following).toBe(true);
  });

  it('unfollowUser should delegate to profilesService.unfollowUser', async () => {
    const res = await controller.unfollowUser('alice', 'u1');
    expect(profilesService.unfollowUser).toHaveBeenCalledWith('alice', 'u1');
    expect(res.profile.following).toBe(false);
  });
});
