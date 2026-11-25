import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  type PipeTransform,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator.js';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../common/dto/error-response.dto.js';
import { CommentsService } from './comments.service.js';
import {
  MultipleCommentsResponseDto,
  SingleCommentResponseDto,
} from './dto/comment-response.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { ListCommentsQueryDto } from './dto/list-comments-query.dto.js';

const SLUG_REGEX = /^[a-zA-Z0-9_-]{1,200}$/;

class ParseSlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !SLUG_REGEX.test(value)) {
      throw new BadRequestException('Invalid article slug');
    }
    return value;
  }
}

@ApiTags('Comments')
@Controller('articles/:slug/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment to an article' })
  @ApiParam({ name: 'slug', description: 'Article slug' })
  @ApiCreatedResponse({
    description: 'Comment created successfully',
    type: SingleCommentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Article not found',
    type: ErrorResponseDto,
  })
  create(
    @Param('slug', ParseSlugPipe) slug: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<SingleCommentResponseDto> {
    return this.commentsService.create(slug, userId, dto);
  }

  @OptionalAuth()
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comments for an article (optional auth)' })
  @ApiParam({ name: 'slug', description: 'Article slug' })
  @ApiOkResponse({
    description: 'Comments returned successfully',
    type: MultipleCommentsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid, expired or revoked access token',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Article not found',
    type: ErrorResponseDto,
  })
  findAll(
    @Param('slug', ParseSlugPipe) slug: string,
    @CurrentUser('userId') userId?: string,
    @Query() query?: ListCommentsQueryDto,
  ): Promise<MultipleCommentsResponseDto> {
    return query
      ? this.commentsService.findAll(slug, userId, query)
      : this.commentsService.findAll(slug, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment from an article' })
  @ApiParam({ name: 'slug', description: 'Article slug' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiNoContentResponse({ description: 'Comment deleted successfully' })
  @ApiBadRequestResponse({
    description: 'Invalid comment UUID',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - not the comment author',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Article or comment not found',
    type: ErrorResponseDto,
  })
  remove(
    @Param('slug', ParseSlugPipe) slug: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    return this.commentsService.remove(slug, id, userId);
  }
}
