import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CurrentUserResponseSchema } from '../../auth/dto/current-user.dto.js';

export const UserResponseSchema = z
  .object({
    user: CurrentUserResponseSchema,
  })
  .strict();

export class UserResponseDto extends createZodDto(UserResponseSchema) {}
