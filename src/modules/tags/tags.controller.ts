import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { TagsResponseDto } from './dto/tags-response.dto.js';
import { TagsService } from './tags.service.js';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  @ApiOkResponse({
    description: 'Tags returned successfully',
    type: TagsResponseDto,
  })
  findAll(): Promise<TagsResponseDto> {
    return this.tagsService.findAll();
  }
}
