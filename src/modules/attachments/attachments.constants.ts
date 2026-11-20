export const ATTACHABLE_TYPES = {
  USER_AVATAR: 'USER_AVATAR',
} as const;

export const AVATAR_SUBDIR = 'avatars';

export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedAvatarMimeType = (typeof ALLOWED_AVATAR_MIME_TYPES)[number];

export const MIME_TO_EXT: Record<AllowedAvatarMimeType, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export interface UploadedAvatarFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export function isAllowedAvatarMimeType(
  mime: string,
): mime is AllowedAvatarMimeType {
  return (ALLOWED_AVATAR_MIME_TYPES as readonly string[]).includes(mime);
}

/**
 * Verifies actual image file signature (magic bytes) to prevent Stored XSS
 * from spoofed Content-Type headers or filenames.
 */
export function detectImageMimeFromMagicBytes(
  buffer: Buffer,
): AllowedAvatarMimeType | null {
  if (buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}
