import { Sequelize, mockDatabase } from '../../src';

describe('foreign key', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase({});

    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  it('should create index for foreign key', async () => {
    const users = db.collection({
      name: 'users',
      fields: [
        {
          type: 'string',
          name: 'name',
        },
      ],
    });

    const posts = db.collection({
      name: 'posts',
      fields: [
        {
          type: 'string',
          name: 'title',
        },
        {
          type: 'belongsTo',
          name: 'user',
          target: 'users',
        },
      ],
    });

    await db.sync();

    const foreignKey = posts.model.rawAttributes['userId'].field;

    const indexes = await db.sequelize.getQueryInterface().showIndex(posts.getTableNameWithSchema());

    // @ts-ignore
    expect(indexes.some((index) => index.fields.some((field) => field.attribute === foreignKey))).toBeTruthy();
  });
});
