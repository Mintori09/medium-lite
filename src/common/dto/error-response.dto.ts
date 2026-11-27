import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ErrorResponseSchema = z
  .object({
    statusCode: z.number().int().meta({
      description: 'HTTP Status Code',
      example: 401,
    }),
    message: z.string().meta({
      description: 'Localized error description',
      example: 'Invalid credentials',
    }),
    error: z
      .string()
      .optional()
      .meta({
        description:
          'HTTP error title (optional, omitted on rate-limit responses)',
        example: 'Unauthorized',
      }),
  })
  .strict();

export class ErrorResponseDto extends createZodDto(ErrorResponseSchema) {}

export const ValidationErrorResponseSchema = z
  .object({
    statusCode: z.number().int().meta({
      description: 'HTTP Status Code',
      example: 400,
    }),
    message: z.array(z.string()).meta({
      description: 'List of localized validation error messages',
      example: ['Email is invalid', 'Password must be at least 12 characters'],
    }),
    error: z.string().meta({
      description: 'HTTP error title',
      example: 'Bad Request',
    }),
  })
  .strict();

export class ValidationErrorResponseDto extends createZodDto(
  ValidationErrorResponseSchema,
) {}
