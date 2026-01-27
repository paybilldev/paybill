import { Op } from 'sequelize';

export default {
  $eq(val: any, ctx) {
    if (ctx?.fieldPath) {
      const field = ctx.db.getFieldByPath(ctx.fieldPath);
      if (field?.type === 'string' && typeof val !== 'string') {
        if (Array.isArray(val)) {
          return {
            [Op.in]: val.map((v) => String(v)),
          };
        }
        return {
          [Op.eq]: String(val),
        };
      }
    }
    if (Array.isArray(val)) {
      return {
        [Op.in]: val,
      };
    }
    return {
      [Op.eq]: val,
    };
  },
} as Record<string, any>;
