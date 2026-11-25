import {
  check,
  defineContract,
  now,
  sql,
} from '@prisma/orm-postgres/contract-builder';

export const contract = defineContract(
  {},
  ({ field, model, rel, gen, type }) => {
    const User = model('User', {
      fields: {
        id: field.column(type.Uuid()).id().onCreate(gen.uuid(7)),
        email: field.column(type.String()).unique(),
        username: field.column(type.String()).unique(),
        passwordHash: field.column(type.String()),
        bio: field.column(type.String()).optional(),
        image: field.column(type.String()).optional(),
        isActive: field.column(type.Boolean()).default(true),
        createdAt: field
          .column(type.DateTime())
          .default(now())
          .onCreate(gen.now()),
        updatedAt: field.column(type.temporal.UpdatedAt()),
      },
    });

    const Follow = model('Follow', {
      fields: {
        id: field.column(type.Uuid()).id().onCreate(gen.uuid(7)),
        followerId: field.column(type.Uuid()),
        followingId: field.column(type.Uuid()),
        createdAt: field
          .column(type.DateTime())
          .default(now())
          .onCreate(gen.now()),
      },
    })
      .relations({
        follower: rel
          .belongsTo(User, { from: 'followerId', to: 'id' })
          .sql({
            fk: {
              onDelete: 'cascade',
              index: 'Follow_followerId_followingId_key',
            },
          }),
        following: rel
          .belongsTo(User, { from: 'followingId', to: 'id' })
          .sql({ fk: { onDelete: 'cascade' } }),
      })
      .attributes(({ fields, constraints }) => ({
        uniques: [
          constraints.unique([fields.followerId, fields.followingId], {
            name: 'Follow_followerId_followingId_key',
          }),
        ],
      }))
      .sql(({ cols, constraints }) => ({
        indexes: [
          constraints.index([cols.followingId], {
            name: 'Follow_followingId_idx',
          }),
        ],
        checks: [
          check({
            name: 'Follow_no_self_follow_chk',
            expression: sql`"followerId" <> "followingId"`,
          }),
        ],
      }));

    const Attachment = model('Attachment', {
      fields: {
        id: field.column(type.Uuid()).id().onCreate(gen.uuid(7)),
        attachableType: field.column(type.String()),
        attachableId: field.column(type.Uuid()),
        url: field.column(type.String()),
        fileName: field.column(type.String()),
        fileType: field.column(type.String()),
        fileSize: field.column(type.Int()),
        createdAt: field
          .column(type.DateTime())
          .default(now())
          .onCreate(gen.now()),
        updatedAt: field.column(type.temporal.UpdatedAt()),
      },
    }).sql(({ cols, constraints }) => ({
      indexes: [
        constraints.index([cols.attachableType, cols.attachableId], {
          name: 'Attachment_attachableType_attachableId_idx',
        }),
      ],
      checks: [
        check({
          name: 'Attachment_fileSize_positive_chk',
          expression: sql`"fileSize" > 0`,
        }),
      ],
    }));

    const Article = model('Article', {
      fields: {
        id: field.column(type.Uuid()).id().onCreate(gen.uuid(7)),
        slug: field.column(type.String()).unique(),
        title: field.column(type.String()),
        description: field.column(type.String()),
        body: field.column(type.String()),
        favoritesCount: field.column(type.Int()).default(0),
        authorId: field.column(type.Uuid()),
        createdAt: field
          .column(type.DateTime())
          .default(now())
          .onCreate(gen.now()),
        updatedAt: field.column(type.temporal.UpdatedAt()),
      },
    })
      .relations({
        author: rel
          .belongsTo(User, { from: 'authorId', to: 'id' })
          .sql({ fk: { onDelete: 'cascade' } }),
      })
      .sql(({ cols, constraints }) => ({
        indexes: [
          constraints.index([cols.authorId], {
            name: 'Article_authorId_idx',
          }),
          constraints.index([cols.createdAt, cols.id], {
            name: 'Article_createdAt_id_idx',
          }),
        ],
        checks: [
          check({
            name: 'Article_favoritesCount_non_negative_chk',
            expression: sql`"favoritesCount" >= 0`,
          }),
        ],
      }));

    const Tag = model('Tag', {
      fields: {
        id: field.column(type.Uuid()).id().onCreate(gen.uuid(7)),
        name: field.column(type.String()).unique(),
      },
    });

    const ArticleTag = model('ArticleTag', {
      fields: {
        articleId: field.column(type.Uuid()),
        tagId: field.column(type.Uuid()),
      },
    })
      .relations({
        article: rel
          .belongsTo(Article, { from: 'articleId', to: 'id' })
          .sql({ fk: { onDelete: 'cascade' } }),
        tag: rel
          .belongsTo(Tag, { from: 'tagId', to: 'id' })
          .sql({ fk: { onDelete: 'cascade' } }),
      })
      .attributes(({ fields, constraints }) => ({
        id: constraints.id([fields.articleId, fields.tagId]),
      }))
      .sql(({ cols, constraints }) => ({
        indexes: [
          constraints.index([cols.tagId], {
            name: 'ArticleTag_tagId_idx',
          }),
        ],
      }));

    const ArticleFavorite = model('ArticleFavorite', {
      fields: {
        userId: field.column(type.Uuid()),
        articleId: field.column(type.Uuid()),
        createdAt: field
          .column(type.DateTime())
          .default(now())
          .onCreate(gen.now()),
      },
    })
      .relations({
        user: rel
          .belongsTo(User, { from: 'userId', to: 'id' })
          .sql({ fk: { onDelete: 'cascade' } }),
        article: rel
          .belongsTo(Article, { from: 'articleId', to: 'id' })
          .sql({ fk: { onDelete: 'cascade' } }),
      })
      .attributes(({ fields, constraints }) => ({
        id: constraints.id([fields.userId, fields.articleId]),
      }))
      .sql(({ cols, constraints }) => ({
        indexes: [
          constraints.index([cols.articleId], {
            name: 'ArticleFavorite_articleId_idx',
          }),
        ],
      }));

    const Comment = model('Comment', {
      fields: {
        id: field.column(type.Uuid()).id().onCreate(gen.uuid(7)),
        body: field.column(type.String()),
        articleId: field.column(type.Uuid()),
        authorId: field.column(type.Uuid()),
        createdAt: field
          .column(type.DateTime())
          .default(now())
          .onCreate(gen.now()),
        updatedAt: field.column(type.temporal.UpdatedAt()),
      },
    })
      .relations({
        article: rel
          .belongsTo(Article, { from: 'articleId', to: 'id' })
          .sql({ fk: { onDelete: 'cascade' } }),
        author: rel
          .belongsTo(User, { from: 'authorId', to: 'id' })
          .sql({ fk: { onDelete: 'cascade' } }),
      })
      .sql(({ cols, constraints }) => ({
        indexes: [
          constraints.index([cols.articleId, cols.createdAt, cols.id], {
            name: 'Comment_articleId_createdAt_id_idx',
          }),
          constraints.index([cols.authorId], {
            name: 'Comment_authorId_idx',
          }),
        ],
      }));

    return {
      models: {
        User: User.relations({
          following: rel.hasMany(Follow, { by: 'followerId' }),
          followers: rel.hasMany(Follow, { by: 'followingId' }),
        }),
        Follow,
        Attachment,
        Article: Article.relations({
          articleTags: rel.hasMany(ArticleTag, { by: 'articleId' }),
          favorites: rel.hasMany(ArticleFavorite, { by: 'articleId' }),
          comments: rel.hasMany(Comment, { by: 'articleId' }),
        }),
        Tag: Tag.relations({
          articleTags: rel.hasMany(ArticleTag, { by: 'tagId' }),
        }),
        ArticleTag,
        ArticleFavorite,
        Comment,
      },
    };
  },
);
