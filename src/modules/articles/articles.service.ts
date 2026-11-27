import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { db } from '../../common/database/db.js';
import type { I18nTranslations } from '../../generated/i18n.generated.js';
import type {
  MultipleArticlesResponseDto,
  SingleArticleResponseDto,
} from './dto/article-response.dto.js';
import type { CreateArticleDto } from './dto/create-article.dto.js';
import type { QueryArticlesDto } from './dto/query-articles.dto.js';
import type { QueryFeedDto } from './dto/query-feed.dto.js';
import type { UpdateArticleDto } from './dto/update-article.dto.js';
import {
  type ArticleEnrichmentMaps,
  type ArticleRecordWithAuthor,
  mapMultipleArticlesResponse,
  mapSingleArticleResponse,
} from './mappers/article.mapper.js';
import { generateArticleSlug } from './utils/article-slug.util.js';
import { normalizeTagNames } from './utils/tag-normalizer.util.js';

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

@Injectable()
export class ArticlesService {
  constructor(private readonly i18n: I18nService<I18nTranslations>) {}

  private t(
    key: Parameters<I18nService<I18nTranslations>['translate']>[0],
  ): string {
    return this.i18n.translate(key, { lang: I18nContext.current()?.lang });
  }

  private async upsertAndAttachTags(
    tx: DbTransaction,
    articleId: string,
    rawTags: string[],
  ): Promise<void> {
    const tagNames = normalizeTagNames(rawTags);
    if (tagNames.length === 0) {
      return;
    }

    await tx.orm.public.Tag.createAndCount(
      tagNames.map((name) => ({ name })),
      { onConflict: 'skip', conflictOn: ['name'] },
    );

    const tags = await tx.orm.public.Tag.where((t) =>
      t.name.in(tagNames),
    ).all();

    await tx.orm.public.ArticleTag.createAndCount(
      tags.map((tag) => ({ articleId, tagId: tag.id })),
      { onConflict: 'skip', conflictOn: ['articleId', 'tagId'] },
    );
  }

  private async attachAuthors(
    articles: Array<{
      id: string;
      slug: string;
      title: string;
      description: string;
      body: string;
      favoritesCount: number;
      authorId: string;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ): Promise<ArticleRecordWithAuthor[]> {
    if (articles.length === 0) {
      return [];
    }

    const authorIds = Array.from(new Set(articles.map((a) => a.authorId)));
    const authors = await db.orm.public.User.where((u) =>
      u.id.in(authorIds),
    ).all();
    const authorMap = new Map(authors.map((a) => [a.id, a]));

    return articles.map((article) => {
      const author = authorMap.get(article.authorId);
      return {
        id: article.id,
        slug: article.slug,
        title: article.title,
        description: article.description,
        body: article.body,
        favoritesCount: article.favoritesCount,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        author: {
          id: article.authorId,
          username: author?.username ?? '',
          bio: author?.bio ?? null,
          image: author?.image ?? null,
        },
      };
    });
  }

  private async enrichArticles(
    articles: ArticleRecordWithAuthor[],
    currentUserId?: string,
  ): Promise<ArticleEnrichmentMaps> {
    const tagsByArticleId = new Map<string, string[]>();
    const favoritedArticleIds = new Set<string>();
    const followingAuthorIds = new Set<string>();

    if (articles.length === 0) {
      return { tagsByArticleId, favoritedArticleIds, followingAuthorIds };
    }

    const articleIds = articles.map((a) => a.id);
    const authorIds = Array.from(new Set(articles.map((a) => a.author.id)));

    const [articleTags, favorites, follows] = await Promise.all([
      db.orm.public.ArticleTag.where((at) =>
        at.articleId.in(articleIds),
      ).all(),
      currentUserId
        ? db.orm.public.ArticleFavorite.where({ userId: currentUserId })
            .where((af) => af.articleId.in(articleIds))
            .all()
        : Promise.resolve([]),
      currentUserId
        ? db.orm.public.Follow.where({ followerId: currentUserId })
            .where((f) => f.followingId.in(authorIds))
            .all()
        : Promise.resolve([]),
    ]);

    if (articleTags.length > 0) {
      const tagIds = Array.from(new Set(articleTags.map((at) => at.tagId)));
      const tags = await db.orm.public.Tag.where((t) => t.id.in(tagIds)).all();
      const tagNameById = new Map(tags.map((t) => [t.id, t.name]));

      for (const at of articleTags) {
        const tagName = tagNameById.get(at.tagId);
        if (!tagName) continue;
        const list = tagsByArticleId.get(at.articleId) ?? [];
        list.push(tagName);
        tagsByArticleId.set(at.articleId, list);
      }

      for (const [articleId, list] of tagsByArticleId.entries()) {
        list.sort();
        tagsByArticleId.set(articleId, list);
      }
    }

    for (const fav of favorites) {
      favoritedArticleIds.add(fav.articleId);
    }

    for (const follow of follows) {
      followingAuthorIds.add(follow.followingId);
    }

    return { tagsByArticleId, favoritedArticleIds, followingAuthorIds };
  }

  private async findArticleRecordBySlug(
    slug: string,
  ): Promise<ArticleRecordWithAuthor> {
    const article = await db.orm.public.Article.first({ slug });
    if (!article) {
      throw new NotFoundException(this.t('articles.notFound'));
    }

    const [withAuthor] = await this.attachAuthors([article]);
    return withAuthor;
  }

  async create(
    userId: string,
    dto: CreateArticleDto,
  ): Promise<SingleArticleResponseDto> {
    const { title, description, body, tagList } = dto.article;
    const slug = generateArticleSlug(title);

    const created = await db.transaction(async (tx) => {
      const article = await tx.orm.public.Article.create({
        slug,
        title,
        description,
        body,
        authorId: userId,
      });

      if (tagList && tagList.length > 0) {
        await this.upsertAndAttachTags(tx, article.id, tagList);
      }

      return article;
    });

    const [withAuthor] = await this.attachAuthors([created]);
    const maps = await this.enrichArticles([withAuthor], userId);
    return mapSingleArticleResponse(withAuthor, maps);
  }

  async findAll(
    query: QueryArticlesDto,
    currentUserId?: string,
  ): Promise<MultipleArticlesResponseDto> {
    const { tag, author, favorited, limit, offset } = query;

    let filterArticleIds: string[] | null = null;

    if (tag) {
      const tagRow = await db.orm.public.Tag.first({
        name: tag.trim().toLowerCase(),
      });
      if (!tagRow) {
        return { articles: [], articlesCount: 0 };
      }
      const articleTags = await db.orm.public.ArticleTag.where({
        tagId: tagRow.id,
      }).all();
      const ids = articleTags.map((at) => at.articleId);
      if (ids.length === 0) {
        return { articles: [], articlesCount: 0 };
      }
      filterArticleIds = ids;
    }

    let filterAuthorId: string | null = null;
    if (author) {
      const authorRow = await db.orm.public.User.first({ username: author });
      if (!authorRow) {
        return { articles: [], articlesCount: 0 };
      }
      filterAuthorId = authorRow.id;
    }

    if (favorited) {
      const favUser = await db.orm.public.User.first({ username: favorited });
      if (!favUser) {
        return { articles: [], articlesCount: 0 };
      }
      const favs = await db.orm.public.ArticleFavorite.where({
        userId: favUser.id,
      }).all();
      const favIds = new Set(favs.map((f) => f.articleId));
      if (favIds.size === 0) {
        return { articles: [], articlesCount: 0 };
      }
      filterArticleIds = filterArticleIds
        ? filterArticleIds.filter((id) => favIds.has(id))
        : Array.from(favIds);
      if (filterArticleIds.length === 0) {
        return { articles: [], articlesCount: 0 };
      }
    }

    let baseQuery = db.orm.public.Article.where((a) => a.id.isNotNull());
    if (filterArticleIds !== null) {
      const ids = filterArticleIds;
      baseQuery = baseQuery.where((a) => a.id.in(ids));
    }
    if (filterAuthorId !== null) {
      const aId = filterAuthorId;
      baseQuery = baseQuery.where((a) => a.authorId.eq(aId));
    }

    let countQuery = db.sql.public.Article.select((_a, fn) => ({
      count: fn.count(),
    }));
    if (filterArticleIds !== null) {
      const ids = filterArticleIds;
      countQuery = countQuery.where((a, fn) => fn.in(a.id, ids));
    }
    if (filterAuthorId !== null) {
      const aId = filterAuthorId;
      countQuery = countQuery.where((a, fn) => fn.eq(a.authorId, aId));
    }

    const [articles, countRows] = await Promise.all([
      baseQuery
        .orderBy([(a) => a.createdAt.desc(), (a) => a.id.desc()])
        .limit(limit)
        .offset(offset)
        .all(),
      db.query(countQuery.build()),
    ]);
    const articlesCount = Number(countRows[0]?.count ?? 0);

    const withAuthors = await this.attachAuthors(articles);
    const maps = await this.enrichArticles(withAuthors, currentUserId);
    return mapMultipleArticlesResponse(
      withAuthors,
      Number(articlesCount),
      maps,
    );
  }

  async findFeed(
    userId: string,
    query: QueryFeedDto,
  ): Promise<MultipleArticlesResponseDto> {
    const { limit, offset } = query;

    const follows = await db.orm.public.Follow.where({
      followerId: userId,
    }).all();

    const followingIds = follows.map((f) => f.followingId);
    if (followingIds.length === 0) {
      return { articles: [], articlesCount: 0 };
    }

    const baseQuery = db.orm.public.Article.where((a) =>
      a.authorId.in(followingIds),
    );

    const countQuery = db.sql.public.Article.select((_a, fn) => ({
      count: fn.count(),
    })).where((a, fn) => fn.in(a.authorId, followingIds));

    const [articles, countRows] = await Promise.all([
      baseQuery
        .orderBy([(a) => a.createdAt.desc(), (a) => a.id.desc()])
        .limit(limit)
        .offset(offset)
        .all(),
      db.query(countQuery.build()),
    ]);
    const articlesCount = Number(countRows[0]?.count ?? 0);

    const withAuthors = await this.attachAuthors(articles);
    const maps = await this.enrichArticles(withAuthors, userId);
    return mapMultipleArticlesResponse(
      withAuthors,
      Number(articlesCount),
      maps,
    );
  }

  async findBySlug(
    slug: string,
    currentUserId?: string,
  ): Promise<SingleArticleResponseDto> {
    const article = await this.findArticleRecordBySlug(slug);
    const maps = await this.enrichArticles([article], currentUserId);
    return mapSingleArticleResponse(article, maps);
  }

  async update(
    slug: string,
    userId: string,
    dto: UpdateArticleDto,
  ): Promise<SingleArticleResponseDto> {
    const existing = await this.findArticleRecordBySlug(slug);
    if (existing.author.id !== userId) {
      throw new ForbiddenException(this.t('articles.forbiddenUpdate'));
    }

    const { title, description, body, tagList } = dto.article;

    await db.transaction(async (tx) => {
      if (
        title !== undefined ||
        description !== undefined ||
        body !== undefined
      ) {
        await tx.orm.public.Article.where({ id: existing.id }).update({
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(body !== undefined ? { body } : {}),
        });
      }

      if (tagList !== undefined) {
        await tx.orm.public.ArticleTag.where({
          articleId: existing.id,
        }).delete();
        await this.upsertAndAttachTags(tx, existing.id, tagList);
      }
    });

    return this.findBySlug(slug, userId);
  }

  async remove(slug: string, userId: string): Promise<void> {
    const existing = await this.findArticleRecordBySlug(slug);
    if (existing.author.id !== userId) {
      throw new ForbiddenException(this.t('articles.forbiddenDelete'));
    }

    await db.orm.public.Article.where({ id: existing.id }).delete();
  }

  async favorite(
    slug: string,
    userId: string,
  ): Promise<SingleArticleResponseDto> {
    const existing = await this.findArticleRecordBySlug(slug);

    await db.transaction(async (tx) => {
      await tx.orm.public.ArticleFavorite.createAndCount(
        [{ userId, articleId: existing.id }],
        { onConflict: 'skip', conflictOn: ['userId', 'articleId'] },
      );

      const countRows = await tx.query(
        db.sql.public.ArticleFavorite.select((_f, fn) => ({
          count: fn.count(),
        }))
          .where((f, fn) => fn.eq(f.articleId, existing.id))
          .build(),
      );

      await tx.orm.public.Article.where({ id: existing.id }).update({
        favoritesCount: Number(countRows[0]?.count ?? 0),
      });
    });

    return this.findBySlug(slug, userId);
  }

  async unfavorite(
    slug: string,
    userId: string,
  ): Promise<SingleArticleResponseDto> {
    const existing = await this.findArticleRecordBySlug(slug);

    await db.transaction(async (tx) => {
      await tx.orm.public.ArticleFavorite.where({
        userId,
        articleId: existing.id,
      }).delete();

      const countRows = await tx.query(
        db.sql.public.ArticleFavorite.select((_f, fn) => ({
          count: fn.count(),
        }))
          .where((f, fn) => fn.eq(f.articleId, existing.id))
          .build(),
      );

      await tx.orm.public.Article.where({ id: existing.id }).update({
        favoritesCount: Number(countRows[0]?.count ?? 0),
      });
    });

    return this.findBySlug(slug, userId);
  }
}
