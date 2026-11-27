import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { env } from '../../common/configs/env.config.js';
import type { db } from '../../common/database/db.js';
import type { Models } from '../../common/database/contract.d.js';
import type { I18nTranslations } from '../../generated/i18n.generated.js';
import {
  ATTACHABLE_TYPES,
  AVATAR_SUBDIR,
  detectImageMimeFromMagicBytes,
  isAllowedAvatarMimeType,
  MIME_TO_EXT,
  type AllowedAvatarMimeType,
  type UploadedAvatarFile,
} from './attachments.constants.js';

const FS_ENOENT = 'ENOENT';

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface PreparedAvatar {
  fileName: string;
  filePath: string;
  publicUrl: string;
  fileType: AllowedAvatarMimeType;
  fileSize: number;
  buffer: Buffer;
}

@Injectable()
export class AttachmentsService implements OnModuleInit {
  constructor(private readonly i18n: I18nService<I18nTranslations>) {}

  private t(
    key: Parameters<I18nService<I18nTranslations>['translate']>[0],
  ): string {
    return this.i18n.translate(key, { lang: I18nContext.current()?.lang });
  }

  getAvatarsDir(): string {
    return path.resolve(env.UPLOAD_DIR, AVATAR_SUBDIR);
  }

  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.getAvatarsDir(), { recursive: true });
  }

  prepareAvatar(file: UploadedAvatarFile): PreparedAvatar {
    if (!isAllowedAvatarMimeType(file.mimetype)) {
      throw new BadRequestException(this.t('attachments.INVALID_FILE_TYPE'));
    }

    const detectedMime = detectImageMimeFromMagicBytes(file.buffer);
    if (!detectedMime || detectedMime !== file.mimetype) {
      throw new BadRequestException(this.t('attachments.INVALID_FILE_CONTENT'));
    }

    const ext = MIME_TO_EXT[detectedMime];
    const fileName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(this.getAvatarsDir(), fileName);
    const serveRoot = env.PUBLIC_SERVE_ROOT.replace(/\/+$/, '');
    const publicUrl = `${serveRoot}/${AVATAR_SUBDIR}/${fileName}`;

    return {
      fileName,
      filePath,
      publicUrl,
      fileType: detectedMime,
      fileSize: file.size,
      buffer: file.buffer,
    };
  }

  async writePreparedFile(prepared: PreparedAvatar): Promise<void> {
    await fs.writeFile(prepared.filePath, prepared.buffer);
  }

  async deleteFileByPath(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== FS_ENOENT) {
        throw error;
      }
    }
  }

  async deleteAvatarFiles(fileNames: string[]): Promise<void> {
    const avatarsDir = this.getAvatarsDir();
    await Promise.all(
      fileNames.map((name) =>
        this.deleteFileByPath(path.join(avatarsDir, name)),
      ),
    );
  }

  async replaceUserAvatarInTx(
    tx: DbTransaction,
    userId: string,
    prepared: PreparedAvatar,
  ): Promise<{ attachment: Models.public_Attachment; oldFileNames: string[] }> {
    const oldFileNames = await this.clearUserAvatarsInTx(tx, userId);

    const attachment = await tx.orm.public.Attachment.create({
      attachableType: ATTACHABLE_TYPES.USER_AVATAR,
      attachableId: userId,
      url: prepared.publicUrl,
      fileName: prepared.fileName,
      fileType: prepared.fileType,
      fileSize: prepared.fileSize,
    });

    return { attachment, oldFileNames };
  }

  async clearUserAvatarsInTx(
    tx: DbTransaction,
    userId: string,
  ): Promise<string[]> {
    const existing = await tx.orm.public.Attachment.where({
      attachableType: ATTACHABLE_TYPES.USER_AVATAR,
      attachableId: userId,
    }).all();

    if (existing.length === 0) {
      return [];
    }

    await tx.orm.public.Attachment.where({
      attachableType: ATTACHABLE_TYPES.USER_AVATAR,
      attachableId: userId,
    }).delete();

    return existing.map((item) => item.fileName);
  }
}
