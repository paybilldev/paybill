import { Collection, Sequelize, mockDatabase } from '../../src';
import { DatetimeInterface } from '../../src/interfaces/datetime-interface';
import { dayjs } from '../../src/utils/dayjs';

describe('Date time interface', () => {
  let db: Sequelize;
  let testCollection: Collection;

  beforeEach(async () => {
    db = await mockDatabase();
    await db.clean({ drop: true });
    testCollection = db.collection({
      name: 'tests',
      fields: [
        {
          name: 'date',
          type: 'date',
        },
        {
          name: 'dateOnly',
          type: 'date',
          uiSchema: {
            ['x-component-props']: {
              showTime: false,
              gmt: false,
            },
          },
        },
        {
          name: 'dateTime',
          type: 'datetime',
          uiSchema: {
            ['x-component-props']: {
              showTime: true,
            },
          },
        },
        {
          name: 'dateTimeGmt',
          type: 'date',
          uiSchema: {
            ['x-component-props']: {
              showTime: true,
              gmt: true,
            },
          },
        },
      ],
    });
  });

  afterEach(async () => {
    await db.close();
  });

  it('should to value', async () => {
    const interfaceInstance = new DatetimeInterface();
    expect(await interfaceInstance.toValue('')).toBe(null);

    expect(await interfaceInstance.toValue('20231223')).toBe(dayjs('2023-12-23 00:00:00.000').toISOString());
    expect(await interfaceInstance.toValue('20231223 08:01:01')).toBe(dayjs('2023-12-23 08:01:01.000').toISOString());
    expect(await interfaceInstance.toValue('2023/12/23')).toBe(dayjs('2023-12-23 00:00:00.000').toISOString());
    expect(await interfaceInstance.toValue('2023-12-23')).toBe(dayjs('2023-12-23 00:00:00.000').toISOString());
    expect(await interfaceInstance.toValue(42510)).toBe('2016-05-20T00:00:00.000Z');
    expect(await interfaceInstance.toValue('42510')).toBe('2016-05-20T00:00:00.000Z');
    expect(await interfaceInstance.toValue('2016-05-20T00:00:00.000Z')).toBe('2016-05-20T00:00:00.000Z');
  });
});
