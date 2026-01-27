import { BaseDialect, Sequelize, mockDatabase } from '../../src';

describe('dialect extend', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  it('should register dialect', async () => {
    class SubDialect extends BaseDialect {
      static dialectName = 'test';

      async checkDatabaseVersion(db: Sequelize): Promise<boolean> {
        return true;
      }
    }

    Sequelize.registerDialect(SubDialect);
    expect(Sequelize.getDialect('test')).toBe(SubDialect);
  });
});
