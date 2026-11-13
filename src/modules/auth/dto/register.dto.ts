import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(12).max(100),
  bio: z.string().optional(),
  image: z.url().optional(),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}
