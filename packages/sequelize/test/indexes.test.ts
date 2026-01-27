import { mockDatabase, Sequelize } from '../src';

describe('database', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  test('indexes', async () => {
    const collection = db.collection({
      name: 'users1',
      autoGenId: false,
      indexes: [
        {
          fields: ['userId'],
        },
        {
          fields: ['groupId'],
        },
      ],
      fields: [
        {
          type: 'string',
          name: 'userId',
        },
        {
          type: 'string',
          name: 'groupId',
        },
      ],
    });
    await db.sync();
    const indexes = (await db.sequelize.getQueryInterface().showIndex('users1')) as any[];
    expect(indexes.length).toBe(2);
  });

  test('indexes', async () => {
    db.collection({
      name: 'groups',
      fields: [
        {
          type: 'string',
          name: 'name',
          unique: true,
        },
      ],
    });
    db.collection({
      name: 'users2',
      autoGenId: false,
      indexes: [
        {
          fields: ['userId'],
        },
        {
          fields: ['groupId'],
        },
      ],
      fields: [
        {
          type: 'string',
          name: 'userId',
        },
        {
          type: 'string',
          name: 'groupId',
        },
        {
          type: 'belongsTo',
          name: 'group',
          target: 'groups',
          foreignKey: 'groupId',
          targetKey: 'name',
        },
      ],
    });
    await db.sync();
    const indexes = (await db.sequelize.getQueryInterface().showIndex('users2')) as any[];
    expect(indexes.length).toBe(2);
  });
});
