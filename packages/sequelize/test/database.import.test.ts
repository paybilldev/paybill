import { Sequelize, mockDatabase } from '../src';
import path from 'path';

describe('database', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  test('import', async () => {
    await db.import({
      directory: path.resolve(__dirname, './fixtures/c0'),
    });
    await db.import({
      directory: path.resolve(__dirname, './fixtures/c1'),
    });
    await db.import({
      directory: path.resolve(__dirname, './fixtures/c2'),
    });

    const test = db.getCollection('tests');

    expect(test.getField('n0')).toBeDefined();
    expect(test.getField('n1')).toBeDefined();
    expect(test.getField('n2')).toBeDefined();
  });
});
