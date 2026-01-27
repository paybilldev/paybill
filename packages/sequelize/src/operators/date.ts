import { Op } from 'sequelize';
import moment from 'moment';
import { parseDate } from '../utils/parse-date';

function isDate(input) {
  return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
}

const toDate = (date, options: any = {}) => {
  const { ctx } = options;
  let val = isDate(date) ? date : new Date(date);
  const field = ctx.db.getFieldByPath(ctx.fieldPath);

  if (!field) {
    return val;
  }

  if (field.constructor.name === 'UnixTimestampField') {
    val = field.dateToValue(val);
  }

  if (field.constructor.name === 'DatetimeNoTzField') {
    val = moment(val).utcOffset('+00:00').format('YYYY-MM-DD HH:mm:ss');
  }

  if (field.constructor.name === 'DateOnlyField') {
    val = moment.utc(val).format('YYYY-MM-DD HH:mm:ss');
  }

  const eventObj = {
    val,
    fieldType: field.type,
  };

  ctx.db.emit('filterToDate', eventObj);

  return eventObj.val;
};

function parseDateTimezone(ctx) {
  const field = ctx.db.getFieldByPath(ctx.fieldPath);

  if (!field) {
    return ctx.db.options.timezone;
  }

  if (field.constructor.name === 'DatetimeNoTzField') {
    return '+00:00';
  }

  if (field.constructor.name === 'DateOnlyField') {
    return '+00:00';
  }

  return ctx.db.options.timezone;
}

export default {
  $dateOn(value, ctx) {
    const r = parseDate(value, {
      timezone: parseDateTimezone(ctx),
    });
    if (typeof r === 'string') {
      return {
        [Op.eq]: toDate(r, { ctx }),
      };
    }

    if (Array.isArray(r)) {
      return {
        [Op.and]: [{ [Op.gte]: toDate(r[0], { ctx }) }, { [Op.lt]: toDate(r[1], { ctx }) }],
      };
    }

    throw new Error(`Invalid Date ${JSON.stringify(value)}`);
  },

  $dateNotOn(value, ctx) {
    const r = parseDate(value, {
      timezone: parseDateTimezone(ctx),
    });
    if (typeof r === 'string') {
      return {
        [Op.ne]: toDate(r, { ctx }),
      };
    }
    if (Array.isArray(r)) {
      return {
        [Op.or]: [{ [Op.lt]: toDate(r[0], { ctx }) }, { [Op.gte]: toDate(r[1], { ctx }) }],
      };
    }

    throw new Error(`Invalid Date ${JSON.stringify(value)}`);
  },

  $dateBefore(value, ctx) {
    const r = parseDate(value, {
      timezone: parseDateTimezone(ctx),
    });

    if (typeof r === 'string') {
      return {
        [Op.lt]: toDate(r, { ctx }),
      };
    } else if (Array.isArray(r)) {
      return {
        [Op.lt]: toDate(r[0], { ctx }),
      };
    }

    throw new Error(`Invalid Date ${JSON.stringify(value)}`);
  },

  $dateNotBefore(value, ctx) {
    const r = parseDate(value, {
      timezone: parseDateTimezone(ctx),
    });
    if (typeof r === 'string') {
      return {
        [Op.gte]: toDate(r, { ctx }),
      };
    } else if (Array.isArray(r)) {
      return {
        [Op.gte]: toDate(r[0], { ctx }),
      };
    }
    throw new Error(`Invalid Date ${JSON.stringify(value)}`);
  },

  $dateAfter(value, ctx) {
    const r = parseDate(value, {
      timezone: parseDateTimezone(ctx),
    });
    if (typeof r === 'string') {
      return {
        [Op.gt]: toDate(r, { ctx }),
      };
    } else if (Array.isArray(r)) {
      return {
        [Op.gte]: toDate(r[1], { ctx }),
      };
    }
    throw new Error(`Invalid Date ${JSON.stringify(value)}`);
  },

  $dateNotAfter(value, ctx) {
    const r = parseDate(value, {
      timezone: parseDateTimezone(ctx),
    });
    if (typeof r === 'string') {
      return {
        [Op.lte]: toDate(r, { ctx }),
      };
    } else if (Array.isArray(r)) {
      return {
        [Op.lt]: toDate(r[1], { ctx }),
      };
    }
    throw new Error(`Invalid Date ${JSON.stringify(value)}`);
  },

  $dateBetween(value, ctx) {
    const r = parseDate(value, {
      timezone: parseDateTimezone(ctx),
    });
    if (r) {
      return {
        [Op.and]: [{ [Op.gte]: toDate(r[0], { ctx }) }, { [Op.lt]: toDate(r[1], { ctx }) }],
      };
    }
    throw new Error(`Invalid Date ${JSON.stringify(value)}`);
  },
} as Record<string, any>;
