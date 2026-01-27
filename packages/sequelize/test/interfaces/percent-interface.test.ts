import { Sequelize, mockDatabase } from '../../src';
import { PercentInterface } from '../../src/interfaces/percent-interface';

describe('percent interface', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  it('should render percent interface', async () => {
    const percentInterface = new PercentInterface({});
    const value = percentInterface.toString(0.5);
    expect(value).toBe('50%');
  });
});
