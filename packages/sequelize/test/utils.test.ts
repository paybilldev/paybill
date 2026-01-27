import { mockDatabase } from '../src/mock-database';
import Sequelize from '../src';

describe('database utils', () => {
  let db: Sequelize;

  afterEach(async () => {
    await db.close();
  });

  beforeEach(async () => {
    db = await mockDatabase({});

    await db.clean({ drop: true });
  });

  it.runIf(process.env['DB_DIALECT'] === 'postgres')('should get database schema', async () => {
    const schema = process.env['DB_SCHEMA'] || 'public';
    expect(db.utils.schema()).toEqual(schema);
  });
});
