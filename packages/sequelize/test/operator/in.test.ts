import { Sequelize, mockDatabase } from '../../src';

describe('operator > $in', () => {
  let db: Sequelize;
  let Test;
  beforeEach(async () => {
    db = await mockDatabase({});
    await db.clean({ drop: true });

    Test = db.collection({
      name: 'tests',
      fields: [{ type: 'string', name: 'name' }],
    });

    await db.sync();
  });

  afterEach(async () => {
    await db.close();
  });

  it('in with empty array should return 0', async () => {
    await db.getRepository('tests').create({});

    const result = await db.getRepository('tests').count({
      filter: {
        'name.$in': [],
      },
    });
    expect(result).toEqual(0);
  });

  it('in with array not contains value should return 0', async () => {
    await db.getRepository('tests').create({
      values: { name: 'test' },
    });

    const result = await db.getRepository('tests').count({
      filter: {
        'name.$in': ['test2', 'test1'],
      },
    });
    expect(result).toEqual(0);
  });

  it('in with array contains value should return 1', async () => {
    await db.getRepository('tests').create({
      values: { name: 'test' },
    });

    const result = await db.getRepository('tests').count({
      filter: {
        'name.$in': ['test', 'test1'],
      },
    });
    expect(result).toEqual(1);
  });

  it('in with null should not throw error', async () => {
    await db.getRepository('tests').create({});

    await expect(
      db.getRepository('tests').count({
        filter: {
          'name.$in': null,
        },
      }),
    ).resolves.not.toThrow();
  });
});
