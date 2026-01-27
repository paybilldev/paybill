import { mockDatabase, Sequelize } from '../src';

describe('model hook', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  describe('match', () => {
    test('sequelize db hooks', async () => {
      const matcher = db.modelHook.match('beforeDefine');
      expect(matcher).toEqual('beforeDefine');
    });

    test('sequelize global model hooks', async () => {
      const matcher = db.modelHook.match('beforeCreate');
      expect(matcher).toEqual('beforeCreate');
    });

    test('sequelize model hooks without existing collection', async () => {
      const matcher = db.modelHook.match('posts.beforeCreate');
      expect(matcher).toEqual('beforeCreate');
    });

    test('sequelize model hooks with existing collection', async () => {
      db.collection({
        name: 'posts',
        fields: [],
      });
      const matcher = db.modelHook.match('posts.beforeCreate');
      expect(matcher).toEqual('beforeCreate');
    });

    test('customized global hooks', async () => {
      const matcher = db.modelHook.match('beforeDefineCollection');
      expect(matcher).toBeNull();
    });

    test('customized model hooks', async () => {
      db.collection({
        name: 'posts',
        fields: [],
      });
      const matcher = db.modelHook.match('posts.beforeCreateWithAssociations');
      expect(matcher).toBeNull();
    });
  });
});
