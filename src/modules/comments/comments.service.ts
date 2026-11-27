import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { db } from '../../common/database/db.js';
import type { I18nTranslations } from '../../generated/i18n.generated.js';
import type {
  MultipleCommentsResponseDto,
  SingleCommentResponseDto,
} from './dto/comment-response.dto.js';
import type { CreateCommentDto } from './dto/create-comment.dto.js';
import { DEFAULT_COMMENTS_LIMIT } from './dto/list-comments-query.dto.js';
import { mapComment } from './mappers/comment.mapper.js';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(private readonly i18n: I18nService<I18nTranslations>) {}

  async create(
    slug: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<SingleCommentResponseDto> {
    const [article, author] = await Promise.all([
      db.orm.public.Article.select('id').first({ slug }),
      db.orm.public.User.select('username', 'bio', 'image').first({
        id: userId,
      }),
    ]);

    if (!article) {
      throw new NotFoundException(this.i18n.t('articles.notFound'));
    }

    if (!author) {
      this.logger.warn(
        `Author ${userId} not found while creating comment on article ${slug}`,
      );
      throw new NotFoundException(this.i18n.t('comments.authorNotFound'));
    }

    const comment = await db.orm.public.Comment.create({
      body: dto.comment.body,
      articleId: article.id,
      authorId: userId,
    });

    this.logger.log(
      `Created comment ${comment.id} on article ${article.id} by user ${userId}`,
    );

    return {
      comment: mapComment({ ...comment, author }, false),
    };
  }

  async findAll(
    slug: string,
    currentUserId?: string,
    query?: { limit?: number; offset?: number },
  ): Promise<MultipleCommentsResponseDto> {
    const article = await db.orm.public.Article.select('id').first({
      slug,
    });

    if (!article) {
      throw new NotFoundException(this.i18n.t('articles.notFound'));
    }

    const limit = query?.limit ?? DEFAULT_COMMENTS_LIMIT;
    const offset = query?.offset ?? 0;

    const comments = await db.orm.public.Comment.select(
      'id',
      'body',
      'authorId',
      'createdAt',
      'updatedAt',
    )
      .where({
        articleId: article.id,
      })
      .orderBy([(c) => c.createdAt.desc(), (c) => c.id.desc()])
      .limit(limit)
      .offset(offset)
      .all();

    if (comments.length === 0) {
      return { comments: [] };
    }

    const authorIds = Array.from(new Set(comments.map((c) => c.authorId)));
    const [authors, followingSet] = await Promise.all([
      db.orm.public.User.select('id', 'username', 'bio', 'image')
        .where((u) => u.id.in(authorIds))
        .all(),
      this.getFollowingSet(authorIds, currentUserId),
    ]);

    const authorMap = new Map(authors.map((a) => [a.id, a]));

    return {
      comments: comments.map((comment) =>
        mapComment(
          { ...comment, author: authorMap.get(comment.authorId)! },
          followingSet.has(comment.authorId),
        ),
      ),
    };
  }

  async remove(slug: string, commentId: string, userId: string): Promise<void> {
    const article = await db.orm.public.Article.select('id').first({
      slug,
    });

    if (!article) {
      throw new NotFoundException(this.i18n.t('articles.notFound'));
    }

    const comment = await db.orm.public.Comment.select(
      'id',
      'authorId',
    ).first({
      id: commentId,
      articleId: article.id,
    });

    if (!comment) {
      throw new NotFoundException(this.i18n.t('comments.notFound'));
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException(this.i18n.t('comments.forbiddenDelete'));
    }

    await db.orm.public.Comment.where({
      id: commentId,
      articleId: article.id,
      authorId: userId,
    }).delete();

    this.logger.log(
      `Deleted comment ${commentId} on article ${article.id} by user ${userId}`,
    );
  }

  private async getFollowingSet(
    authorIds: string[],
    currentUserId?: string,
  ): Promise<Set<string>> {
    if (!currentUserId || authorIds.length === 0) {
      return new Set();
    }

    const targetIds = authorIds.filter((id) => id !== currentUserId);
    if (targetIds.length === 0) {
      return new Set();
    }

    const follows = await db.orm.public.Follow.select('followingId')
      .where((f) => f.followerId.eq(currentUserId))
      .where((f) => f.followingId.in(targetIds))
      .all();

    return new Set(follows.map((f) => f.followingId));
  }
}
