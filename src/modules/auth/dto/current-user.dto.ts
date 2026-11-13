import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const dateTimeField = (description: string) =>
  z.preprocess(
    (val) => (val instanceof Date ? val.toISOString() : val),
    z.string().meta({
      description,
      example: '2026-11-13T08:00:00.000Z',
    }),
  );

export const CurrentUserResponseSchema = z
  .object({
    id: z.string().meta({
      description: 'Unique user identifier',
      example: 'usr_123456789',
    }),
    email: z.email().meta({
      description: 'User email address',
      example: 'user@example.com',
    }),
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
      example: 'https://example.com/avatar.png',
    }),
    isActive: z.boolean().meta({
      description: 'Whether the user account is active',
      example: true,
    }),
    createdAt: dateTimeField('Account creation timestamp'),
    updatedAt: dateTimeField('Account last update timestamp'),
  })
  .strict();

export class CurrentUserResponseDto extends createZodDto(
  CurrentUserResponseSchema,
) {}
