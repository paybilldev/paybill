import { Sequelize, mockDatabase } from '../../src';

describe('afterCreateWithAssociations', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  test('case 1', async () => {
    db.collection({
      name: 'test',
    });
    await db.sync();
    const repo = db.getRepository('test');
    db.on('test.afterCreateWithAssociations', async (model, { transaction }) => {
      throw new Error('test error');
    });
    try {
      await repo.create({
        values: {},
      });
    } catch (error) {
      console.log(error);
    }
    const count = await repo.count();
    expect(count).toBe(0);
  });
});
