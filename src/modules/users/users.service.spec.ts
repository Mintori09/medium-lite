import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from './users.service.js';
import { db } from '../../common/database/db.js';
import type { Models } from '../../common/database/contract.d.js';

vi.mock('../../common/database/db.js', () => {
  return {
    db: {
      orm: {
        public: {
          User: {
            first: vi.fn(),
            where: vi.fn(),
          },
        },
      },
      sql: {
        public: {
          User: {
            insert: vi.fn(),
          },
        },
      },
      query: vi.fn(),
    },
  };
});

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: Models.public_User = {
    id: 'user-123',
    email: 'user@example.com',
    username: 'testuser',
    passwordHash: 'hashed_pw',
    bio: 'Hello world',
    image: 'https://example.com/avatar.png',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService();
  });

  describe('findById', () => {
    it('should return a user when found by id', async () => {
      vi.mocked(db.orm.public.User.first).mockResolvedValue(mockUser);

      const result = await service.findById('user-123');

      expect(db.orm.public.User.first).toHaveBeenCalledWith({ id: 'user-123' });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      vi.mocked(db.orm.public.User.first).mockResolvedValue(null as never);

      const result = await service.findById('non-existent');

      expect(db.orm.public.User.first).toHaveBeenCalledWith({
        id: 'non-existent',
      });
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      vi.mocked(db.orm.public.User.where).mockImplementation(
        (predicate: any) => {
          // Execute the predicate to exercise u.email.eq(email)
          const mockField = { eq: vi.fn() };
          predicate({ email: mockField });
          expect(mockField.eq).toHaveBeenCalledWith('user@example.com');
          return { first: mockFirst } as any;
        },
      );

      const result = await service.findByEmail('user@example.com');

      expect(db.orm.public.User.where).toHaveBeenCalled();
      expect(mockFirst).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when user with email is not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(undefined as never);
      vi.mocked(db.orm.public.User.where).mockImplementation(
        (predicate: any) => {
          predicate({ email: { eq: vi.fn() } });
          return { first: mockFirst } as any;
        },
      );

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return a user when found by username', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockUser);
      vi.mocked(db.orm.public.User.where).mockImplementation(
        (predicate: any) => {
          const mockField = { eq: vi.fn() };
          predicate({ username: mockField });
          expect(mockField.eq).toHaveBeenCalledWith('testuser');
          return { first: mockFirst } as any;
        },
      );

      const result = await service.findByUsername('testuser');

      expect(db.orm.public.User.where).toHaveBeenCalled();
      expect(mockFirst).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when user with username is not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null as never);
      vi.mocked(db.orm.public.User.where).mockImplementation(
        (predicate: any) => {
          predicate({ username: { eq: vi.fn() } });
          return { first: mockFirst } as any;
        },
      );

      const result = await service.findByUsername('notfound');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert user with all fields and return created user', async () => {
      const buildMock = vi.fn().mockReturnValue('mock-plan');
      const returningMock = vi.fn().mockReturnValue({ build: buildMock });
      vi.mocked(db.sql.public.User.insert).mockReturnValue({
        returning: returningMock,
      } as any);
      vi.mocked(db.query).mockResolvedValue([mockUser] as any);

      const input = {
        email: 'user@example.com',
        username: 'testuser',
        passwordHash: 'hashed_pw',
        bio: 'Hello world',
        image: 'https://example.com/avatar.png',
      };

      const result = await service.create(input);

      expect(db.sql.public.User.insert).toHaveBeenCalledWith([
        {
          email: input.email,
          username: input.username,
          passwordHash: input.passwordHash,
          bio: input.bio,
          image: input.image,
          isActive: true,
        },
      ]);
      expect(returningMock).toHaveBeenCalledWith(
        'id',
        'email',
        'username',
        'passwordHash',
        'bio',
        'image',
        'isActive',
        'createdAt',
        'updatedAt',
      );
      expect(buildMock).toHaveBeenCalled();
      expect(db.query).toHaveBeenCalledWith('mock-plan');
      expect(result).toEqual(mockUser);
    });

    it('should default optional bio and image to null when not provided', async () => {
      const buildMock = vi.fn().mockReturnValue('mock-plan');
      const returningMock = vi.fn().mockReturnValue({ build: buildMock });
      vi.mocked(db.sql.public.User.insert).mockReturnValue({
        returning: returningMock,
      } as any);
      vi.mocked(db.query).mockResolvedValue([
        { ...mockUser, bio: null, image: null },
      ] as any);

      const input = {
        email: 'minimal@example.com',
        username: 'minimaluser',
        passwordHash: 'hashed_pw',
      };

      const result = await service.create(input);

      expect(db.sql.public.User.insert).toHaveBeenCalledWith([
        {
          email: input.email,
          username: input.username,
          passwordHash: input.passwordHash,
          bio: null,
          image: null,
          isActive: true,
        },
      ]);
      expect(result.bio).toBeNull();
      expect(result.image).toBeNull();
    });
  });
});
