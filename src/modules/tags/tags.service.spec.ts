import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../common/database/db.js';
import { TagsService } from './tags.service.js';

describe('TagsService', () => {
  let service: TagsService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new TagsService();
  });

  it('returns sorted tag names', async () => {
    vi.spyOn(db.orm.public.Tag, 'orderBy').mockReturnValue({
      all: vi.fn().mockResolvedValue([{ name: 'angularjs' }, { name: 'reactjs' }]),
    } as unknown as ReturnType<typeof db.orm.public.Tag.orderBy>);

    const result = await service.findAll();
    expect(result).toEqual({ tags: ['angularjs', 'reactjs'] });
  });
});
