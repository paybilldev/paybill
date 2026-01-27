import { Op } from 'sequelize';

export default {
  $isFalsy(value) {
    if (value === true || value === 'true') {
      return {
        [Op.or]: {
          [Op.is]: null,
          [Op.eq]: false,
        },
      };
    }
    return {
      [Op.eq]: true,
    };
  },

  $isTruly(value) {
    if (value === true || value === 'true') {
      return {
        [Op.eq]: true,
      };
    }
    return {
      [Op.or]: {
        [Op.is]: null,
        [Op.eq]: false,
      },
    };
  },
} as Record<string, any>;
