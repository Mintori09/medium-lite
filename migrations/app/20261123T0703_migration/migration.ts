#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/380cafc8e1f425119b6786013318ca37365d2fbe1545c40fd27ca7167aa7d6a5/contract';
import endContract from '../../snapshots/380cafc8e1f425119b6786013318ca37365d2fbe1545c40fd27ca7167aa7d6a5/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/53f3e33550134e8b87bc77ebaa795d162cff14db8db1745080b3d44dbd0a728a/contract';
import startContract from '../../snapshots/53f3e33550134e8b87bc77ebaa795d162cff14db8db1745080b3d44dbd0a728a/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Article',
        columns: [
          col('authorId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('favoritesCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Article_favoritesCount_non_negative_chk_1a385303',
            sql`"favoritesCount" >= 0`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'ArticleFavorite',
        columns: [
          col('articleId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['userId', 'articleId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ArticleTag',
        columns: [
          col('articleId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('tagId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['articleId', 'tagId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Attachment',
        columns: [
          col('attachableId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('attachableType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('fileName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fileSize', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('fileType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('Attachment_fileSize_positive_chk_370fc603', sql`"fileSize" > 0`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Follow',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('followerId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('followingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('Follow_no_self_follow_chk_f35b6fca', sql`"followerId" <> "followingId"`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Tag',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Article',
        constraint: 'Article_slug_key',
        columns: ['slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Follow',
        constraint: 'Follow_followerId_followingId_key',
        columns: ['followerId', 'followingId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Tag',
        constraint: 'Tag_name_key',
        columns: ['name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Article',
        index: 'Article_authorId_idx_e47547ed',
        columns: ['authorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Article',
        index: 'Article_createdAt_id_idx_3855cff1',
        columns: ['createdAt', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ArticleFavorite',
        index: 'ArticleFavorite_articleId_idx_3dd188a0',
        columns: ['articleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ArticleFavorite',
        index: 'ArticleFavorite_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ArticleTag',
        index: 'ArticleTag_articleId_idx_3dd188a0',
        columns: ['articleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ArticleTag',
        index: 'ArticleTag_tagId_idx_86854244',
        columns: ['tagId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Attachment',
        index: 'Attachment_attachableType_attachableId_idx_9846a506',
        columns: ['attachableType', 'attachableId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Follow',
        index: 'Follow_followingId_idx_1cf16645',
        columns: ['followingId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Article',
        foreignKey: {
          name: 'Article_authorId_fkey',
          columns: ['authorId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ArticleFavorite',
        foreignKey: {
          name: 'ArticleFavorite_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ArticleFavorite',
        foreignKey: {
          name: 'ArticleFavorite_articleId_fkey',
          columns: ['articleId'],
          references: { schema: 'public', table: 'Article', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ArticleTag',
        foreignKey: {
          name: 'ArticleTag_articleId_fkey',
          columns: ['articleId'],
          references: { schema: 'public', table: 'Article', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ArticleTag',
        foreignKey: {
          name: 'ArticleTag_tagId_fkey',
          columns: ['tagId'],
          references: { schema: 'public', table: 'Tag', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Follow',
        foreignKey: {
          name: 'Follow_followerId_fkey',
          columns: ['followerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Follow',
        foreignKey: {
          name: 'Follow_followingId_fkey',
          columns: ['followingId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
