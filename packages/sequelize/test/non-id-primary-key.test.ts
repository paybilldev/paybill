import { mockDatabase, Sequelize } from '../src';

describe('non-id primary key', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase({});

    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  it('should create auto increment field as primary key', async () => {
    const User = db.collection({
      name: 'users',
      autoGenId: false,
      timestamps: false,
    });
    await db.sync();

    User.setField('field_auto_incr', { type: 'integer', primaryKey: true, autoIncrement: true });

    await db.sync();

    await User.repository.create({});
  });

  it('should add created_at && updated_at field', async () => {
    const User = db.collection({
      name: 'users',
      autoGenId: false,
      timestamps: false,
      fields: [
        {
          type: 'string',
          name: 'name',
        },
      ],
    });

    await db.sync();

    User.setField('created_at', {
      uiSchema: {
        'x-component-props': { dateFormat: 'YYYY-MM-DD', showTime: true, timeFormat: 'HH:mm:ss' },
        type: 'datetime',
        title: '{{t("Created at")}}',
        'x-component': 'DatePicker',
        'x-read-pretty': true,
      },
      name: 'xxxx',
      type: 'date',
      field: 'created_at',
      interface: 'created_at',
    });

    User.setField('updated_at', {
      uiSchema: {
        'x-component-props': { dateFormat: 'YYYY-MM-DD', showTime: true, timeFormat: 'HH:mm:ss' },
        type: 'datetime',
        title: '{{t("Updated at")}}',
        'x-component': 'DatePicker',
        'x-read-pretty': true,
      },
      name: 'updated_attt',
      type: 'date',
      field: 'updated_at',
      interface: 'updated_at',
    });

    await db.sync();

    const user = await User.repository.create({
      values: { name: 'test' },
    });

    expect(user.get('xxxx')).toBeTruthy();
    expect(user.get('updated_attt')).toBeTruthy();
  });
});
