import { Injectable } from '@nestjs/common';
import { db } from '../../common/database/db.js';
import type { Models } from '../../common/database/contract.d.js';

@Injectable()
export class UsersService {
  async findById(id: string): Promise<Models.public_User | null> {
    const user = await db.orm.public.User.first({ id });
    return user ?? null;
  }

  async findByEmail(email: string): Promise<Models.public_User | null> {
    const user = await db.orm.public.User.where((u) =>
      u.email.eq(email),
    ).first();
    return user ?? null;
  }

  async findByUsername(username: string): Promise<Models.public_User | null> {
    const user = await db.orm.public.User.where((u) =>
      u.username.eq(username),
    ).first();
    return user ?? null;
  }

  async create(data: {
    email: string;
    username: string;
    passwordHash: string;
    bio?: string | null;
    image?: string | null;
  }): Promise<Models.public_User> {
    const plan = db.sql.public.User.insert([
      {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        bio: data.bio ?? null,
        image: data.image ?? null,
        isActive: true,
      },
    ])
      .returning(
        'id',
        'email',
        'username',
        'passwordHash',
        'bio',
        'image',
        'isActive',
        'createdAt',
        'updatedAt',
      )
      .build();

    const [createdUser] = await db.query(plan);
    return createdUser;
  }
}
