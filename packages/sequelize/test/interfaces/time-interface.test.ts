import { Sequelize, mockDatabase } from '../../src';
import { TimeInterface } from '../../src/interfaces/time-interface';
import { dayjs } from '../../src/utils/dayjs';

describe('TimeInterface', () => {
  let db: Sequelize;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  describe('toValue', () => {
    it('should return value', async () => {
      db.collection({
        name: 'tests',
        fields: [
          {
            name: 'time',
            type: 'time',
          },
        ],
      });
      await db.sync();
      await db.getRepository('tests').create({
        values: {
          time: '12:34:56',
        },
      });
      const record = await db.getRepository('tests').findOne();
      const interfaceInstance = new TimeInterface();
      const value = await interfaceInstance.toValue(record.get('time'));
      expect(value).toEqual('12:34:56');
    });

    it('should return dayjs', async () => {
      const time = dayjs('2024-01-01T12:34:56Z');
      const interfaceInstance = new TimeInterface();
      const value = await interfaceInstance.toValue(time);
      expect(value).toEqual(time.format('HH:mm:ss'));
    });

    it('should return format', async () => {
      const time = dayjs('2024-01-01T12:34:56Z').format('HH:mm:ss');
      const interfaceInstance = new TimeInterface();
      const value = await interfaceInstance.toValue(time);
      expect(value).toEqual(time);
    });
  });
});
