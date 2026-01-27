import { Sequelize, mockDatabase } from '../../src';
import { SelectInterface } from '../../src/interfaces/select-interface';

describe('SelectInterface', () => {
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
      const options = {
        uiSchema: {
          enum: [
            { value: '1', label: 'Label1' },
            { value: '2', label: 'Label2' },
          ],
        },
      };

      const interfaceInstance = new SelectInterface(options);
      const value = await interfaceInstance.toValue('Label1');
      expect(value).toEqual('1');
    });
  });
});
