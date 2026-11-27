import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AuthTokensSchema = z
  .object({
    accessToken: z.string().meta({
      description: 'JWT Access Token used for authenticating requests',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIx...access',
    }),
  })
  .strict();

export class AuthTokensDto extends createZodDto(AuthTokensSchema) {}
