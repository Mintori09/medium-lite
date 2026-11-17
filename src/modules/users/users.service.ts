import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { db } from '../../common/database/db.js';
import type { Models } from '../../common/database/contract.d.js';
import { getUniqueViolationConstraint } from '../../common/utils/database-error.util.js';
import type { I18nTranslations } from '../../generated/i18n.generated.js';
import type { UploadedAvatarFile } from '../attachments/attachments.constants.js';
import {
  AttachmentsService,
  type PreparedAvatar,
} from '../attachments/attachments.service.js';
import type { CurrentUserResponse } from '../auth/interfaces/jwt-payload.interface.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

export type UserRecord = Omit<Models.public_User, 'followers' | 'following'>;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  private t(
    key: Parameters<I18nService<I18nTranslations>['translate']>[0],
  ): string {
    return this.i18n.translate(key, { lang: I18nContext.current()?.lang });
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await db.orm.public.User.first({ id });
    return user ?? null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await db.orm.public.User.where((u) =>
      u.email.eq(email),
    ).first();
    return user ?? null;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const user = await db.orm.public.User.where((u) =>
      u.username.eq(username),
    ).first();
    return user ?? null;
  }

  async create(data: {
    email: string;
    username: string;
    passwordHash: string;
    bio?: string | null;
    image?: string | null;
  }): Promise<UserRecord> {
    const plan = db.sql.public.User.insert([
      {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        bio: data.bio ?? null,
        image: data.image ?? null,
        isActive: true,
      },
    ])
      .returning(
        'id',
        'email',
        'username',
        'passwordHash',
        'bio',
        'image',
        'isActive',
        'createdAt',
        'updatedAt',
      )
      .build();

    const [createdUser] = await db.query(plan);
    return createdUser;
  }

  async updateUser(
    userId: string,
    dto: UpdateUserDto,
    avatarFile?: UploadedAvatarFile,
  ): Promise<{ user: CurrentUserResponse }> {
    const currentUser = await this.findById(userId);
    if (!currentUser) {
      throw new NotFoundException(this.t('users.USER_NOT_FOUND'));
    }

    const normalizedEmail = dto.email?.toLowerCase();
    if (normalizedEmail && normalizedEmail !== currentUser.email) {
      const existingEmail = await this.findByEmail(normalizedEmail);
      if (existingEmail && existingEmail.id !== userId) {
        throw new ConflictException(this.t('auth.EMAIL_EXISTS'));
      }
    }

    if (dto.username && dto.username !== currentUser.username) {
      const existingUsername = await this.findByUsername(dto.username);
      if (existingUsername && existingUsername.id !== userId) {
        throw new ConflictException(this.t('auth.USERNAME_EXISTS'));
      }
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    let preparedAvatar: PreparedAvatar | null = null;
    if (avatarFile) {
      preparedAvatar = this.attachmentsService.prepareAvatar(avatarFile);
      await this.attachmentsService.writePreparedFile(preparedAvatar);
    }

    let updatedUser: UserRecord;
    let oldAvatarFilesToDelete: string[] = [];

    try {
      const result = await db.transaction(async (tx) => {
        let nextImage: string | null | undefined = dto.image;

        if (preparedAvatar) {
          const { attachment, oldFileNames } =
            await this.attachmentsService.replaceUserAvatarInTx(
              tx,
              userId,
              preparedAvatar,
            );
          oldAvatarFilesToDelete = oldFileNames;
          nextImage = attachment.url;
        } else if (dto.image !== undefined) {
          oldAvatarFilesToDelete =
            await this.attachmentsService.clearUserAvatarsInTx(tx, userId);
        }

        const user = await tx.orm.public.User.where({ id: userId }).update({
          email: normalizedEmail,
          username: dto.username,
          passwordHash,
          bio: dto.bio,
          image: nextImage,
        });

        if (!user) {
          throw new NotFoundException(this.t('users.USER_NOT_FOUND'));
        }

        return user;
      });

      updatedUser = result;
    } catch (error) {
      if (preparedAvatar) {
        await this.attachmentsService.deleteFileByPath(preparedAvatar.filePath);
      }

      const constraint = getUniqueViolationConstraint(error);
      if (constraint !== null) {
        if (constraint.includes('email')) {
          throw new ConflictException(this.t('auth.EMAIL_EXISTS'));
        }
        if (constraint.includes('username')) {
          throw new ConflictException(this.t('auth.USERNAME_EXISTS'));
        }
        throw new ConflictException(this.t('users.DUPLICATE_FIELD'));
      }

      throw error;
    }

    if (oldAvatarFilesToDelete.length > 0) {
      try {
        await this.attachmentsService.deleteAvatarFiles(oldAvatarFilesToDelete);
      } catch (error) {
        this.logger.warn({
          message: 'Failed to delete old avatar files',
          userId,
          fileNames: oldAvatarFilesToDelete,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const { passwordHash: _hash, ...userWithoutPasswordHash } = updatedUser;
    return { user: userWithoutPasswordHash };
  }
}
