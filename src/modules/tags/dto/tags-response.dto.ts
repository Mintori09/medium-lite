import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TagsResponseSchema = z.object({
  tags: z.array(z.string()).meta({
    description: 'List of all unique tag names',
    example: ['angularjs', 'dragons', 'reactjs'],
  }),
});

export class TagsResponseDto extends createZodDto(TagsResponseSchema) {}
