import { Sequelize, mockDatabase } from '../src';
import { vi } from 'vitest';

// TODO
describe('sequelize-hooks', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
    await db.sync();
  });

  afterEach(async () => {
    await db.close();
  });

  test('exec order', async () => {
    const collection = db.collection({
      name: 't_test',
    });
    const orders = [];
    db.on('beforeCreate', () => {
      orders.push('beforeCreate');
    });
    db.on('t_test.beforeCreate', () => {
      orders.push('model.beforeCreate');
    });
    db.on('afterCreate', () => {
      orders.push('afterCreate');
    });
    db.on('t_test.afterCreate', () => {
      orders.push('model.afterCreate');
    });
    await collection.sync();
    await collection.model.create();
    expect(orders).toEqual(['model.beforeCreate', 'beforeCreate', 'model.afterCreate', 'afterCreate']);
  });

  describe('afterSync', () => {
    test('singular name', async () => {
      const collection = db.collection({
        name: 't_test',
      });
      const spy = vi.fn();
      db.on('t_test.afterSync', () => {
        spy('afterSync');
      });
      await collection.sync();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    test('plural name', async () => {
      const collection = db.collection({
        name: 't_tests',
      });
      const spy = vi.fn();
      db.on('t_tests.afterSync', () => {
        spy('afterSync');
      });
      await collection.sync();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
