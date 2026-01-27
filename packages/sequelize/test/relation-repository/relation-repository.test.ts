import { mockDatabase, MockDatabase } from '../../src';

describe('relation repository', () => {
  let db: MockDatabase;
  beforeEach(async () => {
    db = await mockDatabase();
  });

  afterEach(async () => {
    await db.clean({ drop: true });
    await db.close();
  });

  it('should not convert string source id to number', async () => {
    db.collection({
      name: 'tags',
      fields: [{ type: 'string', name: 'name' }],
    });
    const User = db.collection({
      name: 'users',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'hasMany', name: 'tags', sourceKey: 'name', target: 'tags', foreignKey: 'userId' },
      ],
    });
    await db.sync();
    await User.repository.create({
      values: { name: '123', tags: [{ name: 'tag1' }] },
    });
    const repo = db.getRepository('users.tags', '123');
    await expect(repo.find()).resolves.not.toThrow();
  });
});
