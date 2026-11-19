import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const emptyStringToNull = (val: unknown) => (val === '' ? null : val);

export const UpdateUserSchema = z
  .object({
    email: z.string().trim().pipe(z.email()).optional(),
    username: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/)
      .optional(),
    currentPassword: z.string().min(1).max(100).optional(),
    password: z
      .string()
      .min(12)
      .max(100)
      .refine((val) => val.trim().length > 0)
      .optional(),
    bio: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    image: z.preprocess(emptyStringToNull, z.url().nullable().optional()),
  })
  .superRefine((data, ctx) => {
    if (data.password !== undefined && !data.currentPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['currentPassword'],
        message: 'Current password is required when changing password',
      });
    }
  });

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
