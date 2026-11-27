import { Injectable } from '@nestjs/common';
import { db } from '../../common/database/db.js';
import type { TagsResponseDto } from './dto/tags-response.dto.js';

@Injectable()
export class TagsService {
  async findAll(): Promise<TagsResponseDto> {
    const tags = await db.orm.public.Tag.orderBy((t) => t.name.asc()).all();

    return {
      tags: tags.map((tag) => tag.name),
    };
  }
}
