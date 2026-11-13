import { defineContract, now } from '@prisma/orm-postgres/contract-builder';

export const contract = defineContract(
  {},
  ({ field, model, _rel, gen, type }) => {
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

    return {
      models: {
        User: User.relations({}),
      },
    };
  },
);
