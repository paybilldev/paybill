import Sequelize, { mockDatabase } from '../../src';

describe('multi filter target key', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  it('should get count of multi filter target keys', async () => {
    const Student = db.collection({
      name: 'students',
      autoGenId: false,
      filterTargetKey: ['name', 'classId'],
      fields: [
        {
          name: 'name',
          type: 'string',
          primaryKey: true,
        },
        {
          name: 'classId',
          type: 'bigInt',
          primaryKey: true,
        },
        {
          name: 'age',
          type: 'integer',
        },
      ],
    });

    await db.sync();

    const s1 = await Student.repository.create({
      values: {
        name: 's1',
        classId: 1,
        age: 10,
      },
    });

    const s2 = await Student.repository.create({
      values: {
        name: 's1',
        classId: 2,
        age: 10,
      },
    });

    const s3 = await Student.repository.create({
      values: {
        name: 's3',
        classId: 2,
        age: 10,
      },
    });

    const count = await Student.repository.count({});

    expect(count).toBe(3);
  });

  it('should set multi filter target keys', async () => {
    const Student = db.collection({
      name: 'students',
      autoGenId: false,
      filterTargetKey: ['name', 'classId'],
      fields: [
        {
          name: 'name',
          type: 'string',
          primaryKey: true,
        },
        {
          name: 'classId',
          type: 'bigInt',
          primaryKey: true,
        },
        {
          name: 'age',
          type: 'integer',
        },
      ],
    });

    await db.sync();

    const s1 = await Student.repository.create({
      values: {
        name: 's1',
        classId: 1,
        age: 10,
      },
    });

    // it should find by name and classId
    const findRes = await Student.repository.find({
      filterByTk: {
        name: 's1',
        classId: 1,
      },
    });

    expect(findRes.length).toBe(1);

    // update
    await Student.repository.update({
      filterByTk: {
        name: 's1',
        classId: 1,
      },
      values: {
        age: '20',
      },
    });

    const s1Updated = await Student.repository.findOne({
      filterByTk: {
        name: 's1',
        classId: 1,
      },
    });

    expect(s1Updated.age).toBe(20);

    // destroy
    await Student.repository.destroy({
      filterByTk: {
        name: 's1',
        classId: 1,
      },
    });

    expect(await Student.repository.count()).toBe(0);
  });

  it('should save multi filter target keys association', async () => {
    const Class = db.collection({
      name: 'classes',
      autoGenId: true,
      fields: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'students',
          type: 'hasMany',
          target: 'students',
          foreignKey: 'classId',
          targetKey: 'name',
        },
      ],
    });

    const Student = db.collection({
      name: 'students',
      autoGenId: false,
      filterTargetKey: ['key1', 'key2'],
      fields: [
        {
          name: 'name',
          type: 'string',
          primaryKey: true,
        },
        {
          name: 'key1',
          type: 'bigInt',
        },
        {
          name: 'key2',
          type: 'string',
        },
        {
          name: 'age',
          type: 'integer',
        },
      ],
    });

    await db.sync();

    const s1 = await Student.repository.create({
      values: {
        name: 's1',
        key1: 1,
        key2: 'k1',
      },
    });

    const s2 = await Student.repository.create({
      values: {
        name: 's2',
        key1: 2,
        key2: 'k2',
      },
    });

    const c1 = await Class.repository.create({
      values: {
        name: 'c1',
        students: [
          {
            name: 's1',
            key1: 1,
            key2: 'k1',
          },
          {
            name: 's2',
            key1: 2,
            key2: 'k2',
          },
        ],
      },
    });

    const c1Students = await Class.repository.find({
      filterByTk: {
        name: 'c1',
      },
      appends: ['students'],
    });

    expect(c1Students[0].students.length).toBe(2);
  });
});
