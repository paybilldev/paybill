import { default as _ } from 'lodash';
import { Op } from 'sequelize';

export default {
  $in(val, ctx) {
    return {
      [Op.in]: val == null ? [] : _.castArray(val),
    };
  },
} as Record<string, any>;
