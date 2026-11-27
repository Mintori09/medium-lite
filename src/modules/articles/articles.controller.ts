import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
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
import { ArticlesService } from './articles.service.js';
import {
  MultipleArticlesResponseDto,
  SingleArticleResponseDto,
} from './dto/article-response.dto.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { QueryArticlesDto } from './dto/query-articles.dto.js';
import { QueryFeedDto } from './dto/query-feed.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @OptionalAuth()
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List articles with optional filters and pagination' })
  @ApiOkResponse({
    description: 'Articles returned successfully',
    type: MultipleArticlesResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid, expired or revoked access token',
    type: ErrorResponseDto,
  })
  findAll(
    @Query() query: QueryArticlesDto,
    @CurrentUser('userId') userId?: string,
  ): Promise<MultipleArticlesResponseDto> {
    return this.articlesService.findAll(query, userId);
  }

  @Get('feed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get feed of articles from followed authors' })
  @ApiOkResponse({
    description: 'Feed articles returned successfully',
    type: MultipleArticlesResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  findFeed(
    @Query() query: QueryFeedDto,
    @CurrentUser('userId') userId: string,
  ): Promise<MultipleArticlesResponseDto> {
    return this.articlesService.findFeed(userId, query);
  }

  @OptionalAuth()
  @Get(':slug')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single article by slug (optional auth)' })
  @ApiParam({ name: 'slug', description: 'Article slug' })
  @ApiOkResponse({
    description: 'Article returned successfully',
    type: SingleArticleResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid, expired or revoked access token',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Article not found',
    type: ErrorResponseDto,
  })
  findBySlug(
    @Param('slug') slug: string,
    @CurrentUser('userId') userId?: string,
  ): Promise<SingleArticleResponseDto> {
    return this.articlesService.findBySlug(slug, userId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new article' })
  @ApiCreatedResponse({
    description: 'Article created successfully',
    type: SingleArticleResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateArticleDto,
  ): Promise<SingleArticleResponseDto> {
    return this.articlesService.create(userId, dto);
  }

  @Put(':slug')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing article' })
  @ApiParam({ name: 'slug', description: 'Article slug' })
  @ApiOkResponse({
    description: 'Article updated successfully',
    type: SingleArticleResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: only the author can update this article',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Article not found',
    type: ErrorResponseDto,
  })
  update(
    @Param('slug') slug: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateArticleDto,
  ): Promise<SingleArticleResponseDto> {
    return this.articlesService.update(slug, userId, dto);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an article' })
  @ApiParam({ name: 'slug', description: 'Article slug' })
  @ApiNoContentResponse({
    description: 'Article deleted successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: only the author can delete this article',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Article not found',
    type: ErrorResponseDto,
  })
  remove(
    @Param('slug') slug: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    return this.articlesService.remove(slug, userId);
  }

  @Post(':slug/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Favorite an article' })
  @ApiParam({ name: 'slug', description: 'Article slug' })
  @ApiOkResponse({
    description: 'Article favorited successfully',
    type: SingleArticleResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Article not found',
    type: ErrorResponseDto,
  })
  favorite(
    @Param('slug') slug: string,
    @CurrentUser('userId') userId: string,
  ): Promise<SingleArticleResponseDto> {
    return this.articlesService.favorite(slug, userId);
  }

  @Delete(':slug/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfavorite an article' })
  @ApiParam({ name: 'slug', description: 'Article slug' })
  @ApiOkResponse({
    description: 'Article unfavorited successfully',
    type: SingleArticleResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Article not found',
    type: ErrorResponseDto,
  })
  unfavorite(
    @Param('slug') slug: string,
    @CurrentUser('userId') userId: string,
  ): Promise<SingleArticleResponseDto> {
    return this.articlesService.unfavorite(slug, userId);
  }
}
