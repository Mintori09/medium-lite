import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ProfileSchema = z
  .object({
    username: z.string().meta({
      description: 'Unique user handle',
      example: 'john_doe',
    }),
    bio: z.string().nullable().meta({
      description: 'User biography description',
      example: 'Software Engineer',
    }),
    image: z.string().nullable().meta({
      description: 'User profile avatar URL',
      example: '/public/uploads/avatars/0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b.webp',
    }),
    following: z.boolean().meta({
      description: 'Whether the current authenticated user follows this profile',
      example: false,
    }),
  })
  .strict();

export const ProfileResponseSchema = z
  .object({
    profile: ProfileSchema,
  })
  .strict();

export class ProfileResponseDto extends createZodDto(ProfileResponseSchema) {}

export type ProfilePayload = z.infer<typeof ProfileResponseSchema>;
