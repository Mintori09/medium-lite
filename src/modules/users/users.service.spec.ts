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
      transaction: vi.fn(),
    },
  };
});

describe('UsersService', () => {
  let service: UsersService;
  let mockAttachmentsService: {
    prepareAvatar: ReturnType<typeof vi.fn>;
    writePreparedFile: ReturnType<typeof vi.fn>;
    replaceUserAvatarInTx: ReturnType<typeof vi.fn>;
    clearUserAvatarsInTx: ReturnType<typeof vi.fn>;
    deleteFileByPath: ReturnType<typeof vi.fn>;
    deleteAvatarFiles: ReturnType<typeof vi.fn>;
  };
  let mockI18n: { translate: ReturnType<typeof vi.fn> };

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
    mockAttachmentsService = {
      prepareAvatar: vi.fn(),
      writePreparedFile: vi.fn(),
      replaceUserAvatarInTx: vi.fn(),
      clearUserAvatarsInTx: vi.fn(),
      deleteFileByPath: vi.fn(),
      deleteAvatarFiles: vi.fn(),
    };
    mockI18n = {
      translate: vi.fn((key: string) => key),
    };
    service = new UsersService(
      mockAttachmentsService as never,
      mockI18n as never,
    );
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
    const mockUserWhere = (field: 'email' | 'username', value: unknown) => {
      const mockFirst = vi.fn().mockResolvedValue(value);
      const mockField = { eq: vi.fn() };
      vi.mocked(db.orm.public.User.where).mockImplementation(
        (predicate: any) => {
          predicate({ [field]: mockField });
          return { first: mockFirst } as any;
        },
      );
      return { mockFirst, mockField };
    };

    it('should return a user when found by email', async () => {
      const { mockFirst, mockField } = mockUserWhere('email', mockUser);

      const result = await service.findByEmail('user@example.com');

      expect(db.orm.public.User.where).toHaveBeenCalled();
      expect(mockField.eq).toHaveBeenCalledWith('user@example.com');
      expect(mockFirst).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when user with email is not found', async () => {
      mockUserWhere('email', undefined);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    const mockUserWhere = (value: unknown) => {
      const mockFirst = vi.fn().mockResolvedValue(value);
      const mockField = { eq: vi.fn() };
      vi.mocked(db.orm.public.User.where).mockImplementation(
        (predicate: any) => {
          predicate({ username: mockField });
          return { first: mockFirst } as any;
        },
      );
      return { mockFirst, mockField };
    };

    it('should return a user when found by username', async () => {
      const { mockFirst, mockField } = mockUserWhere(mockUser);

      const result = await service.findByUsername('testuser');

      expect(db.orm.public.User.where).toHaveBeenCalled();
      expect(mockField.eq).toHaveBeenCalledWith('testuser');
      expect(mockFirst).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when user with username is not found', async () => {
      mockUserWhere(null);

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

  describe('updateUser', () => {
    const createPreparedAvatar = () => ({
      fileName: 'new.png',
      filePath: '/tmp/new.png',
      url: '/uploads/new.png',
      mimeType: 'image/png',
      size: 100,
    });

    it('should throw NotFoundException if user does not exist', async () => {
      vi.mocked(db.orm.public.User.first).mockResolvedValue(null as never);
      await expect(
        service.updateUser('missing', { bio: 'new' }),
      ).rejects.toThrow('users.USER_NOT_FOUND');
    });

    it('should throw ConflictException if email is taken by another user', async () => {
      vi.mocked(db.orm.public.User.first).mockResolvedValueOnce(mockUser);
      vi.spyOn(service, 'findByEmail').mockResolvedValueOnce({
        ...mockUser,
        id: 'other-user',
      });

      await expect(
        service.updateUser('user-123', { email: 'taken@example.com' }),
      ).rejects.toThrow('auth.EMAIL_EXISTS');
    });

    it('should throw ConflictException if username is taken by another user', async () => {
      vi.mocked(db.orm.public.User.first).mockResolvedValueOnce(mockUser);
      vi.spyOn(service, 'findByUsername').mockResolvedValueOnce({
        ...mockUser,
        id: 'other-user',
      });

      await expect(
        service.updateUser('user-123', { username: 'takenuser' }),
      ).rejects.toThrow('auth.USERNAME_EXISTS');
    });

    it('should update user with avatar upload and delete old avatar files', async () => {
      vi.mocked(db.orm.public.User.first).mockResolvedValueOnce(mockUser);
      const prepared = createPreparedAvatar();
      mockAttachmentsService.prepareAvatar.mockReturnValue(prepared);
      mockAttachmentsService.replaceUserAvatarInTx.mockResolvedValue({
        attachment: { url: '/uploads/new.png' },
        oldFileNames: ['old.png'],
      });

      const txUpdate = vi.fn().mockResolvedValue({
        ...mockUser,
        image: '/uploads/new.png',
      });
      vi.mocked(db.transaction).mockImplementation(async (cb) =>
        cb({ orm: { public: { User: { where: () => ({ update: txUpdate }) } } } } as never),
      );

      const res = await service.updateUser(
        'user-123',
        { bio: 'updated' },
        { buffer: Buffer.from('x'), mimetype: 'image/png', size: 100 } as never,
      );

      expect(mockAttachmentsService.writePreparedFile).toHaveBeenCalledWith(prepared);
      expect(mockAttachmentsService.deleteAvatarFiles).toHaveBeenCalledWith(['old.png']);
      expect(res.user.image).toBe('/uploads/new.png');
      expect((res.user as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('should clear avatars when image is set to null without uploading a file', async () => {
      vi.mocked(db.orm.public.User.first).mockResolvedValueOnce(mockUser);
      mockAttachmentsService.clearUserAvatarsInTx.mockResolvedValue(['old.png']);

      const txUpdate = vi.fn().mockResolvedValue({
        ...mockUser,
        image: null,
      });
      vi.mocked(db.transaction).mockImplementation(async (cb) =>
        cb({ orm: { public: { User: { where: () => ({ update: txUpdate }) } } } } as never),
      );

      const res = await service.updateUser('user-123', { image: null });

      expect(mockAttachmentsService.clearUserAvatarsInTx).toHaveBeenCalled();
      expect(mockAttachmentsService.deleteAvatarFiles).toHaveBeenCalledWith(['old.png']);
      expect(res.user.image).toBeNull();
    });

    it('should allow updating when email and username are unchanged', async () => {
      vi.mocked(db.orm.public.User.first).mockResolvedValueOnce(mockUser);
      const findByEmailSpy = vi.spyOn(service, 'findByEmail');
      const findByUsernameSpy = vi.spyOn(service, 'findByUsername');
      const txUpdate = vi.fn().mockResolvedValue(mockUser);
      vi.mocked(db.transaction).mockImplementation(async (cb) =>
        cb({ orm: { public: { User: { where: () => ({ update: txUpdate }) } } } } as never),
      );

      await service.updateUser('user-123', {
        email: mockUser.email,
        username: mockUser.username,
      });

      expect(findByEmailSpy).not.toHaveBeenCalled();
      expect(findByUsernameSpy).not.toHaveBeenCalled();
    });

    it('should cleanup prepared avatar and map unique violation errors', async () => {
      vi.mocked(db.orm.public.User.first).mockResolvedValueOnce(mockUser);
      const prepared = createPreparedAvatar();
      mockAttachmentsService.prepareAvatar.mockReturnValue(prepared);
      vi.mocked(db.transaction).mockRejectedValue({
        sqlState: '23505',
        constraint: 'User_email_key',
      });

      await expect(
        service.updateUser(
          'user-123',
          {},
          { buffer: Buffer.from('x'), mimetype: 'image/png', size: 100 } as never,
        ),
      ).rejects.toThrow('auth.EMAIL_EXISTS');

      expect(mockAttachmentsService.deleteFileByPath).toHaveBeenCalledWith('/tmp/new.png');
    });

    it('should map username unique violation to ConflictException', async () => {
      vi.mocked(db.orm.public.User.first).mockResolvedValueOnce(mockUser);
      vi.mocked(db.transaction).mockRejectedValue({
        sqlState: '23505',
        constraint: 'User_username_key',
      });

      await expect(
        service.updateUser('user-123', { bio: 'updated' }),
      ).rejects.toThrow('auth.USERNAME_EXISTS');
    });
  });
});
