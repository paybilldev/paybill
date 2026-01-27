import { Collection, mockDatabase, Sequelize } from '../../src';
import { vi } from 'vitest';

describe('repository chunk', () => {
  let db: Sequelize;
  let Post: Collection;
  let User: Collection;

  afterEach(async () => {
    await db.close();
  });

  beforeEach(async () => {
    db = await mockDatabase();

    await db.clean({ drop: true });

    User = db.collection({
      name: 'users',
      fields: [
        {
          type: 'string',
          name: 'name',
        },
        {
          type: 'hasMany',
          name: 'posts',
        },
      ],
    });

    Post = db.collection({
      name: 'posts',
      fields: [
        {
          type: 'string',
          name: 'title',
        },
        {
          type: 'belongsTo',
          name: 'user',
        },
      ],
    });

    await db.sync();
  });

  it('should find items with chunk', async () => {
    const values = Array.from({ length: 99 }, (_, i) => ({ name: `user-${i}` }));

    const repository = db.getRepository('users');

    await repository.create({
      values,
    });

    const chunkCallback = vi.fn();

    await repository.chunk({
      chunkSize: 10,
      callback: chunkCallback,
    });

    expect(chunkCallback).toHaveBeenCalledTimes(10);
  });

  it('should chunk with limit', async () => {
    const values = Array.from({ length: 99 }, (_, i) => ({ name: `user-${i}` }));

    const repository = db.getRepository('users');

    await repository.create({
      values,
    });

    let totalCount = 0;
    const chunkCallback = vi.fn();

    await repository.chunk({
      chunkSize: 10,
      limit: 11,
      callback: async (rows) => {
        chunkCallback();
        totalCount += rows.length;
      },
    });

    expect(chunkCallback).toHaveBeenCalledTimes(2);
    expect(totalCount).toBe(11);
  });
});
