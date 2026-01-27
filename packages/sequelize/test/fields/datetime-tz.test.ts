import { Sequelize, Repository } from '../../src';
import { mockDatabase } from '../../src/mock-database';

describe('timezone', () => {
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

  it('should save with timezone value', async () => {
    db.collection({
      name: 'tests',
      timestamps: false,
      fields: [{ name: 'date1', type: 'datetimeTz' }],
    });

    await db.sync();

    const repository = db.getRepository('tests');

    const instance = await repository.create({ values: { date1: '2023-03-23T12:00:00.000Z' } });
    const date1 = instance.get('date1');
    expect(date1.toISOString()).toEqual('2023-03-23T12:00:00.000Z');
  });

  it('should create field with default value', async () => {
    db.collection({
      name: 'tests',
      timestamps: false,
      fields: [{ name: 'date1', type: 'datetimeTz', defaultValue: '2023-03-23T18:00:00.000Z' }],
    });

    let err;
    try {
      await db.sync();
    } catch (e) {
      err = e;
    }

    expect(err).toBeUndefined();

    const repository = db.getRepository('tests');

    const instance = await repository.create({});
    const date1 = instance.get('date1');

    expect(date1.toISOString()).toEqual('2023-03-23T18:00:00.000Z');
  });

  describe('timezone', () => {
    test('custom', async () => {
      db.collection({
        name: 'tests',
        timestamps: false,
        fields: [{ name: 'date1', type: 'date', timezone: '+06:00' }],
      });

      await db.sync();
      const repository = db.getRepository('tests');
      const instance = await repository.create({ values: { date1: '2023-03-24 00:00:00' } });
      const date1 = instance.get('date1');
      expect(date1.toISOString()).toEqual('2023-03-23T18:00:00.000Z');
    });

    test('client', async () => {
      db.collection({
        name: 'tests',
        timestamps: false,
        fields: [{ name: 'date1', type: 'date', timezone: 'client' }],
      });

      await db.sync();
      const repository = db.getRepository('tests');
      const instance = await repository.create({
        values: { date1: '2023-03-24 01:00:00' },
        context: {
          timezone: '+01:00',
        },
      });
      const date1 = instance.get('date1');
      expect(date1.toISOString()).toEqual('2023-03-24T00:00:00.000Z');
    });

    test('server', async () => {
      db.collection({
        name: 'tests',
        fields: [{ name: 'date1', type: 'date', timezone: 'server' }],
      });

      await db.sync();
      const repository = db.getRepository('tests');
      const instance = await repository.create({ values: { date1: '2023-03-24 08:00:00' } });
      const date1 = instance.get('date1');
      expect(date1.toISOString()).toEqual('2023-03-24T00:00:00.000Z');
    });
  });
});

describe('date-field', () => {
  let db: Sequelize;
  let repository: Repository;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
    db.collection({
      name: 'tests',
      fields: [{ name: 'date1', type: 'date' }],
    });
    await db.sync();
    repository = db.getRepository('tests');
  });

  afterEach(async () => {
    await db.close();
  });

  it('should set default value if collection is middle table in belongs to many association', async () => {
    const middleTable = db.collection({
      name: 'test_middle',
      fields: [{ name: 'date1', type: 'datetimeTz', defaultToCurrentTime: true, allowNull: false }],
    });

    const sourceTable = db.collection({
      name: 'test_source',
      fields: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'target',
          target: 'test_target',
          type: 'belongsToMany',
          through: 'test_middle',
        },
      ],
    });

    const targetTable = db.collection({
      name: 'test_target',
      fields: [
        { name: 'name', type: 'string' },
        { name: 'source', target: 'test_source', type: 'belongsToMany', through: 'test_middle' },
      ],
    });

    await db.sync();

    const sourceInstance = await sourceTable.repository.create({ values: { name: 'source' } });
    const targetInstance = await targetTable.repository.create({ values: { name: 'target' } });

    await sourceTable.repository.update({
      values: {
        target: [targetInstance.get('id')],
      },
      filter: { id: sourceInstance.get('id') },
    });
  });

  it('should set default to current time', async () => {
    const c1 = db.collection({
      name: 'test11',
      fields: [
        {
          name: 'date1',
          type: 'date',
          defaultToCurrentTime: true,
        },
      ],
    });

    await db.sync();

    const instance = await c1.repository.create({});
    const date1 = instance.get('date1');
    expect(date1).toBeTruthy();
  });

  it('should set to current time when update', async () => {
    const c1 = db.collection({
      name: 'test11',
      fields: [
        {
          name: 'date1',
          type: 'date',
          onUpdateToCurrentTime: true,
        },
        {
          name: 'title',
          type: 'string',
        },
      ],
    });

    await db.sync();

    const instance = await c1.repository.create({
      values: {
        title: 'test',
      },
    });

    const date1Val = instance.get('date1');
    expect(date1Val).toBeDefined();

    await c1.repository.update({
      values: {
        title: 'test2',
      },
      filter: {
        id: instance.get('id'),
      },
    });

    await instance.reload();

    const date1Val2 = instance.get('date1');
    expect(date1Val2).toBeDefined();

    expect(date1Val2.getTime()).toBeGreaterThan(date1Val.getTime());
  });

  test('create', async () => {
    const createExpectToBe = async (key, actual, expected) => {
      const instance = await repository.create({
        values: {
          [key]: actual,
        },
      });
      return expect(instance.get(key).toISOString()).toEqual(expected);
    };

    await createExpectToBe('date1', '2023-03-24', '2023-03-24T00:00:00.000Z');
    await createExpectToBe('date1', '2023-03-24T16:00:00.000Z', '2023-03-24T16:00:00.000Z');
  });

  describe('dateOn', () => {
    test('dateOn operator', async () => {
      await repository.find({
        filter: {
          date1: {
            $dateOn: '2023-03-24',
          },
        },
      });

      await repository.find({
        filter: {
          date1: {
            $dateOn: '2023-03-24+06:00',
          },
        },
      });

      await repository.find({
        filter: {
          date1: {
            $dateOn: '2023-03-23T20:00:00+08:00',
          },
        },
      });
    });
  });
});
