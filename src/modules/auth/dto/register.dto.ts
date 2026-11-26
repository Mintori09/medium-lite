import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z
    .string()
    .min(12)
    .refine((pw) => Buffer.byteLength(pw, 'utf8') <= 72, {
      message: 'Password must not exceed 72 bytes in UTF-8 encoding',
      params: { i18nKey: 'validation.PASSWORD_MAX_BYTES', maxBytes: 72 },
    }),
  bio: z.string().optional(),
  image: z.url().optional(),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}
