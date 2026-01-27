import { mockDatabase, Sequelize, PasswordField } from '../../src';

describe('password field', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  it('case 1', async () => {
    const User = db.collection({
      name: 'users',
      fields: [{ type: 'password', name: 'password' }],
    });
    await db.sync();
    let user = await User.model.create<any>({
      password: '123456',
    });
    const pwd = User.getField<PasswordField>('password');
    expect(await pwd.verify('123456', user.password)).toBeTruthy();
    user.set('password', '654321');
    await user.save();
    expect(await pwd.verify('654321', user.password)).toBeTruthy();
    user.set('password', null);
    await user.save();
    user = await User.model.findOne();
    expect(await pwd.verify('654321', user.password)).toBeTruthy();
  });

  it('should be encrypted when adding password fields in batches', async () => {
    const User = db.collection({
      name: 'users',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'password', name: 'password' },
      ],
    });
    await db.sync();
    const instances = await User.model.bulkCreate([
      {
        password: '123456',
        name: 'zhangsan',
      },
    ]);
    const pwd = User.getField<PasswordField>('password');
    expect(await pwd.verify('123456', instances[0].password)).toBeTruthy();
    const user = await User.model.findOne({ where: { name: 'zhangsan' } });
    expect(await pwd.verify('123456', user.password)).toBeTruthy();
  });
});
