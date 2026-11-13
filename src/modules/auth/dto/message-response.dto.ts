import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const MessageResponseSchema = z
  .object({
    message: z.string().meta({
      description: 'Operation result status message',
      example: 'Operation successful',
    }),
  })
  .strict();

export class MessageResponseDto extends createZodDto(MessageResponseSchema) {}
