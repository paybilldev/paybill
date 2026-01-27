import { Sequelize, mockDatabase } from '../../src';

describe('hook', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  it('should get hook modelName', async () => {
    const Posts = db.collection({
      name: 'posts',
      fields: [
        {
          type: 'string',
          name: 'title',
        },
      ],
    });

    expect(Posts.model.options.modelName).toBe('posts');
    const Tags = db.collection({
      name: 'tags',
      fields: [
        {
          type: 'string',
          name: 'name',
        },
      ],
    });

    Posts.setField('tags', {
      type: 'belongsToMany',
      target: 'tags',
      through: 'post',
    });

    await db.sync();

    const throughCollection = db.getCollection('post');
    throughCollection.setField('test', { type: 'string' });

    const callback = vi.fn();
    db.on('post.afterSync', (options) => {
      callback(options);
    });

    await throughCollection.sync();

    expect(callback).toHaveBeenCalledOnce();
  });
});
