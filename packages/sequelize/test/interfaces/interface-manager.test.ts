import { Sequelize, mockDatabase } from '../../src';
import { BaseInterface } from '../../src/interfaces/base-interface';

describe('interface manager', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  it('should register field interface', async () => {
    class TestInterface extends BaseInterface {
      toString(value: any) {
        return `test-${value}`;
      }
    }

    db.interfaceManager.registerInterfaceType('test', TestInterface);
    expect(db.interfaceManager.getInterfaceType('test')).toBe(TestInterface);
  });
});
