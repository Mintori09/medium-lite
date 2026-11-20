import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { I18nService } from 'nestjs-i18n';
import type { I18nTranslations } from '../../generated/i18n.generated.js';
import { AttachmentsService } from './attachments.service.js';
import { ATTACHABLE_TYPES } from './attachments.constants.js';

const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:fs/promises', () => ({
  default: fsMocks,
  ...fsMocks,
}));

describe('AttachmentsService', () => {
  let service: AttachmentsService;
  const mockI18n = {
    translate: vi.fn((key: string) => key),
  } as unknown as I18nService<I18nTranslations>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AttachmentsService(mockI18n);
  });

  describe('prepareAvatar', () => {
    it('should prepare a valid PNG buffer and map extension to .png', () => {
      const pngMagic = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);

      const prepared = service.prepareAvatar({
        fieldname: 'avatar',
        originalname: 'evil.html',
        encoding: '7bit',
        mimetype: 'image/png',
        size: pngMagic.length,
        buffer: pngMagic,
      });

      expect(prepared.fileName).toMatch(/\.png$/);
      expect(prepared.fileType).toBe('image/png');
      expect(prepared.publicUrl).toMatch(/^\/public\/uploads\/avatars\/.+\.png$/);
    });

    it('should reject disallowed MIME types', () => {
      expect(() =>
        service.prepareAvatar({
          fieldname: 'avatar',
          originalname: 'script.html',
          encoding: '7bit',
          mimetype: 'text/html',
          size: 20,
          buffer: Buffer.from('<html><script>alert(1)</script></html>'),
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject spoofed image/png when magic bytes are HTML (Stored XSS)', () => {
      expect(() =>
        service.prepareAvatar({
          fieldname: 'avatar',
          originalname: 'avatar.html',
          encoding: '7bit',
          mimetype: 'image/png',
          size: 20,
          buffer: Buffer.from('<html><script>alert(1)</script></html>'),
        }),
      ).toThrow(BadRequestException);
    });

    it('should prepare valid JPEG and WebP buffers', () => {
      const jpegMagic = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const jpegPrepared = service.prepareAvatar({
        fieldname: 'avatar',
        originalname: 'photo.jpeg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: jpegMagic.length,
        buffer: jpegMagic,
      });
      expect(jpegPrepared.fileName).toMatch(/\.jpg$/);
      expect(jpegPrepared.fileType).toBe('image/jpeg');

      const webpMagic = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      const webpPrepared = service.prepareAvatar({
        fieldname: 'avatar',
        originalname: 'photo.webp',
        encoding: '7bit',
        mimetype: 'image/webp',
        size: webpMagic.length,
        buffer: webpMagic,
      });
      expect(webpPrepared.fileName).toMatch(/\.webp$/);
      expect(webpPrepared.fileType).toBe('image/webp');
    });

    it('should reject empty (0-byte) buffer', () => {
      expect(() =>
        service.prepareAvatar({
          fieldname: 'avatar',
          originalname: 'empty.png',
          encoding: '7bit',
          mimetype: 'image/png',
          size: 0,
          buffer: Buffer.alloc(0),
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('replaceUserAvatarInTx', () => {
    it('should delete old attachment records and insert new one inside tx', async () => {
      const deleteMock = vi.fn().mockResolvedValue(undefined);
      const allMock = vi
        .fn()
        .mockResolvedValue([{ id: 'old-1', fileName: 'old.png' }]);
      const createMock = vi.fn().mockResolvedValue({
        id: 'new-1',
        attachableType: ATTACHABLE_TYPES.USER_AVATAR,
        attachableId: 'user-1',
        url: '/public/uploads/avatars/new.png',
        fileName: 'new.png',
        fileType: 'image/png',
        fileSize: 12,
      });

      const tx = {
        orm: {
          public: {
            Attachment: {
              where: vi.fn().mockReturnValue({
                all: allMock,
                delete: deleteMock,
              }),
              create: createMock,
            },
          },
        },
      } as unknown as Parameters<AttachmentsService['replaceUserAvatarInTx']>[0];

      const { attachment, oldFileNames } = await service.replaceUserAvatarInTx(
        tx,
        'user-1',
        {
          fileName: 'new.png',
          filePath: '/tmp/new.png',
          publicUrl: '/public/uploads/avatars/new.png',
          fileType: 'image/png',
          fileSize: 12,
          buffer: Buffer.alloc(12),
        },
      );

      expect(oldFileNames).toEqual(['old.png']);
      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(attachment.id).toBe('new-1');
    });
  });

  describe('clearUserAvatarsInTx', () => {
    it('should delete existing user avatar records and return old file names', async () => {
      const deleteMock = vi.fn().mockResolvedValue(undefined);
      const allMock = vi
        .fn()
        .mockResolvedValue([{ id: 'old-1', fileName: 'old-1.png' }]);

      const tx = {
        orm: {
          public: {
            Attachment: {
              where: vi.fn().mockReturnValue({
                all: allMock,
                delete: deleteMock,
              }),
            },
          },
        },
      } as unknown as Parameters<AttachmentsService['clearUserAvatarsInTx']>[0];

      const oldFileNames = await service.clearUserAvatarsInTx(tx, 'user-1');
      expect(oldFileNames).toEqual(['old-1.png']);
      expect(deleteMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('file operations', () => {
    it('writePreparedFile should write buffer to filePath', async () => {
      await service.writePreparedFile({
        fileName: 'a.png',
        filePath: '/tmp/uploads/a.png',
        publicUrl: '/public/uploads/avatars/a.png',
        fileType: 'image/png',
        fileSize: 4,
        buffer: Buffer.from('test'),
      });

      expect(fsMocks.writeFile).toHaveBeenCalledWith(
        '/tmp/uploads/a.png',
        Buffer.from('test'),
      );
    });

    it('deleteFileByPath should ignore ENOENT and rethrow other errors', async () => {
      fsMocks.unlink.mockRejectedValueOnce({ code: 'ENOENT' });
      await expect(
        service.deleteFileByPath('/tmp/missing.png'),
      ).resolves.toBeUndefined();

      const permErr = Object.assign(new Error('EACCES'), { code: 'EACCES' });
      fsMocks.unlink.mockRejectedValueOnce(permErr);
      await expect(
        service.deleteFileByPath('/tmp/locked.png'),
      ).rejects.toThrow('EACCES');
    });

    it('deleteAvatarFiles should delete each file', async () => {
      await service.deleteAvatarFiles(['a.png', 'b.png']);
      expect(fsMocks.unlink).toHaveBeenCalledTimes(2);
    });
  });
});
