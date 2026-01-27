import { Sequelize, mockDatabase } from '../../src';

describe('text field', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  it('should create text field type', async () => {
    const Test = db.collection({
      name: 'tests',
      fields: [
        {
          type: 'text',
          name: 'text1',
          defaultValue: 'a',
        },
        {
          type: 'text',
          name: 'text2',
          length: 'tiny',
          defaultValue: 'a',
        },
        {
          type: 'text',
          name: 'text3',
          length: 'medium',
          defaultValue: 'a',
        },
        {
          type: 'text',
          name: 'text4',
          length: 'long',
          defaultValue: 'a',
        },
      ],
    });
    await Test.sync();
  });

  it('trim', async () => {
    const collection = db.collection({
      name: 'tests',
      fields: [{ type: 'text', name: 'name', trim: true }],
    });
    await db.sync();
    const model = await collection.model.create({
      name: '  n1\n ',
    });
    expect(model.get('name')).toBe('n1');
  });

  it('trim when value is null should be null', async () => {
    const collection = db.collection({
      name: 'tests',
      fields: [{ type: 'string', name: 'name', trim: true }],
    });
    await db.sync();
    const model = await collection.model.create({
      name: null,
    });
    expect(model.get('name')).toBeFalsy();
  });

  it('when value is number should be convert to string', async () => {
    const collection = db.collection({
      name: 'tests',
      fields: [{ type: 'string', name: 'name', trim: true }],
    });
    await db.sync();
    const model = await collection.model.create({
      name: 123,
    });
    expect(model.get('name')).toBe('123');
  });
});
