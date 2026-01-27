import { mockDatabase, Sequelize } from '../../src';

describe('date only', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase({
      timezone: '+08:00',
    });
    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  it('should set date field with dateOnly', async () => {
    db.collection({
      name: 'tests',
      fields: [{ name: 'date1', type: 'dateOnly' }],
    });

    await db.sync();

    const item = await db.getRepository('tests').create({
      values: {
        date1: '2023-03-24',
      },
    });

    expect(item.get('date1')).toBe('2023-03-24');
  });
});
