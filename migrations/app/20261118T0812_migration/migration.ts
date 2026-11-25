#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/53f3e33550134e8b87bc77ebaa795d162cff14db8db1745080b3d44dbd0a728a/contract';
import startContract from '../../snapshots/53f3e33550134e8b87bc77ebaa795d162cff14db8db1745080b3d44dbd0a728a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d539de5babc558d439597ea9dbd87340f09dac5ec010d154002300c9b058742e/contract';
import endContract from '../../snapshots/d539de5babc558d439597ea9dbd87340f09dac5ec010d154002300c9b058742e/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
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
      this.addUnique({
        schema: 'public',
        table: 'Follow',
        constraint: 'Follow_followerId_followingId_key',
        columns: ['followerId', 'followingId'],
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
