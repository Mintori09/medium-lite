import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentsService } from './comments.service.js';

const mockOrm = vi.hoisted(() => ({
  Article: {
    select: vi.fn(),
  },
  User: {
    select: vi.fn(),
  },
  Comment: {
    create: vi.fn(),
    where: vi.fn(),
    select: vi.fn(),
  },
  Follow: {
    select: vi.fn(),
  },
}));

vi.mock('../../common/database/db.js', () => ({
  db: { orm: { public: mockOrm } },
}));

describe('CommentsService', () => {
  let service: CommentsService;

  const mockI18n = {
    t: vi.fn((key: string) => key),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  describe('create', () => {
    it('should create a comment and return mapped response without follow queries', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      mockOrm.Article.select.mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'article-1' }),
      });
      mockOrm.Comment.create.mockResolvedValue({
        id: 'comment-1',
        body: 'Nice post!',
        articleId: 'article-1',
        authorId: 'user-1',
        createdAt: now,
        updatedAt: now,
      });
      mockOrm.User.select.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          username: 'alice',
          bio: 'Dev',
          image: null,
        }),
      });

      const result = await service.create('test-slug', 'user-1', {
        comment: { body: 'Nice post!' },
      });

      expect(result).toEqual({
        comment: {
          id: 'comment-1',
          body: 'Nice post!',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          author: {
            username: 'alice',
            bio: 'Dev',
            image: null,
            following: false,
          },
        },
      });
      expect(mockOrm.Follow.select).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if article does not exist', async () => {
      mockOrm.Article.select.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      });

      await expect(
        service.create('missing-slug', 'user-1', {
          comment: { body: 'Hello' },
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockOrm.Comment.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return comments ordered by createdAt desc, id desc with batch following', async () => {
      const t1 = new Date('2026-01-02T00:00:00.000Z');
      const t2 = new Date('2026-01-01T00:00:00.000Z');
      mockOrm.Article.select.mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'article-1' }),
      });
      const allComments = vi.fn().mockResolvedValue([
        {
          id: 'c-2',
          body: 'Second',
          authorId: 'user-2',
          createdAt: t1,
          updatedAt: t1,
        },
        {
          id: 'c-1',
          body: 'First',
          authorId: 'user-1',
          createdAt: t2,
          updatedAt: t2,
        },
      ]);
      const orderBy = vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockReturnValue({ all: allComments }),
        }),
      });
      mockOrm.Comment.select.mockReturnValue({
        where: vi.fn().mockReturnValue({ orderBy }),
      });

      mockOrm.User.select.mockReturnValue({
        where: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue([
            { id: 'user-2', username: 'bob', bio: null, image: null },
            { id: 'user-1', username: 'alice', bio: 'Dev', image: null },
          ]),
        }),
      });

      const followAll = vi
        .fn()
        .mockResolvedValue([{ followingId: 'user-2' }]);
      const followWhere2 = vi.fn().mockReturnValue({ all: followAll });
      const followWhere1 = vi.fn().mockReturnValue({ where: followWhere2 });
      mockOrm.Follow.select.mockReturnValue({ where: followWhere1 });

      const result = await service.findAll('test-slug', 'user-1');

      expect(orderBy).toHaveBeenCalled();
      expect(result.comments).toHaveLength(2);
      expect(result.comments[0]?.author.following).toBe(true);
      expect(result.comments[1]?.author.following).toBe(false);
    });

    it('should not query follow table when unauthenticated', async () => {
      mockOrm.Article.select.mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'article-1' }),
      });
      mockOrm.Comment.select.mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockReturnValue({
                all: vi.fn().mockResolvedValue([
                  {
                    id: 'c-1',
                    body: 'First',
                    authorId: 'user-2',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]),
              }),
            }),
          }),
        }),
      });
      mockOrm.User.select.mockReturnValue({
        where: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue([
            { id: 'user-2', username: 'bob', bio: null, image: null },
          ]),
        }),
      });

      const result = await service.findAll('test-slug');

      expect(mockOrm.Follow.select).not.toHaveBeenCalled();
      expect(result.comments[0]?.author.following).toBe(false);
    });

    it('should throw NotFoundException if article does not exist', async () => {
      mockOrm.Article.select.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      });

      await expect(service.findAll('missing-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete comment when user is the author', async () => {
      mockOrm.Article.select.mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'article-1' }),
      });
      mockOrm.Comment.select.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'comment-1',
          authorId: 'user-1',
        }),
      });
      const deleteFn = vi.fn().mockResolvedValue([{ id: 'comment-1' }]);
      mockOrm.Comment.where.mockReturnValue({ delete: deleteFn });

      await expect(
        service.remove('test-slug', 'comment-1', 'user-1'),
      ).resolves.toBeUndefined();

      expect(mockOrm.Comment.where).toHaveBeenCalledWith({
        id: 'comment-1',
        articleId: 'article-1',
        authorId: 'user-1',
      });
    });

    it('should throw ForbiddenException when user is not the comment author', async () => {
      mockOrm.Article.select.mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'article-1' }),
      });
      mockOrm.Comment.select.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'comment-1',
          authorId: 'user-2',
        }),
      });

      await expect(
        service.remove('test-slug', 'comment-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockOrm.Comment.where).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if comment does not exist', async () => {
      mockOrm.Article.select.mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'article-1' }),
      });
      mockOrm.Comment.select.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      });

      await expect(
        service.remove('test-slug', 'comment-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if concurrent delete removed the comment', async () => {
      mockOrm.Article.select.mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'article-1' }),
      });
      mockOrm.Comment.select.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'comment-1',
          authorId: 'user-1',
        }),
      });
      mockOrm.Comment.where.mockReturnValue({
        delete: vi.fn().mockResolvedValue(null),
      });

      await expect(
        service.remove('test-slug', 'comment-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
