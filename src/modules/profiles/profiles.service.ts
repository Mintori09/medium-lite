import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { db } from '../../common/database/db.js';
import type { I18nTranslations } from '../../generated/i18n.generated.js';
import { UsersService, type UserRecord } from '../users/users.service.js';
import type { ProfilePayload } from './dto/profile-response.dto.js';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly usersService: UsersService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  private t(
    key: Parameters<I18nService<I18nTranslations>['translate']>[0],
  ): string {
    return this.i18n.translate(key, { lang: I18nContext.current()?.lang });
  }

  private async findTargetUserByUsername(
    username: string,
  ): Promise<UserRecord> {
    const user = await this.usersService.findByUsername(username.trim());
    if (!user) {
      throw new NotFoundException(this.t('profiles.USER_NOT_FOUND'));
    }
    return user;
  }

  private toProfilePayload(
    user: UserRecord,
    following: boolean,
  ): ProfilePayload {
    return {
      profile: {
        username: user.username,
        bio: user.bio,
        image: user.image,
        following,
      },
    };
  }

  async getProfile(
    username: string,
    currentUserId?: string,
  ): Promise<ProfilePayload> {
    const targetUser = await this.findTargetUserByUsername(username);

    if (!currentUserId || currentUserId === targetUser.id) {
      return this.toProfilePayload(targetUser, false);
    }

    const followRecord = await db.orm.public.Follow.first({
      followerId: currentUserId,
      followingId: targetUser.id,
    });

    return this.toProfilePayload(targetUser, Boolean(followRecord));
  }

  async followUser(
    username: string,
    currentUserId: string,
  ): Promise<ProfilePayload> {
    const targetUser = await this.findTargetUserByUsername(username);

    if (targetUser.id === currentUserId) {
      throw new BadRequestException(this.t('profiles.CANNOT_FOLLOW_SELF'));
    }

    await db.orm.public.Follow.createAndCount(
      [{ followerId: currentUserId, followingId: targetUser.id }],
      { onConflict: 'skip', conflictOn: ['followerId', 'followingId'] },
    );

    return this.toProfilePayload(targetUser, true);
  }

  async unfollowUser(
    username: string,
    currentUserId: string,
  ): Promise<ProfilePayload> {
    const targetUser = await this.findTargetUserByUsername(username);

    if (targetUser.id === currentUserId) {
      throw new BadRequestException(this.t('profiles.CANNOT_UNFOLLOW_SELF'));
    }

    await db.orm.public.Follow.where({
      followerId: currentUserId,
      followingId: targetUser.id,
    }).deleteAndCount();

    return this.toProfilePayload(targetUser, false);
  }
}
