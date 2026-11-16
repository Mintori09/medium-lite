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

    return {
      models: {
        User: User.relations({
          following: rel.hasMany(Follow, { by: 'followerId' }),
          followers: rel.hasMany(Follow, { by: 'followingId' }),
        }),
        Follow,
        Attachment,
      },
    };
  },
);
