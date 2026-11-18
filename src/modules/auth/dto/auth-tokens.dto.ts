import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AuthTokensSchema = z
  .object({
    accessToken: z.string().meta({
      description: 'JWT Access Token used for authenticating requests',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIx...access',
    }),
    refreshToken: z.string().meta({
      description: 'JWT Refresh Token used for issuing new access tokens',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIx...refresh',
    }),
  })
  .strict();

export class AuthTokensDto extends createZodDto(AuthTokensSchema) {}
