import { default as _ } from 'lodash';
import { BaseInterface } from './base-interface';

export class NumberInterface extends BaseInterface {
  sanitizeValue(value: any) {
    if (typeof value === 'string') {
      if (['n/a', '-'].includes(value.toLowerCase())) {
        return null;
      }

      if (value.includes(',')) {
        value = value.replace(/,/g, '');
      }
    }

    return value;
  }

  async toValue(value: any) {
    if (value === null || value === undefined || typeof value === 'number') {
      return value;
    }

    if (!value) {
      return null;
    }

    const sanitizedValue = this.sanitizeValue(value);
    const numberValue = this.parseValue(sanitizedValue);

    if (!this.validate(numberValue)) {
      throw new Error(`Invalid number value: "${value}"`);
    }

    return numberValue;
  }

  parseValue(value) {
    return value;
  }

  validate(value) {
    return !isNaN(value);
  }

  toString(value: number, ctx?: any) {
    value = super.toString(value, ctx);
    const step = this.options?.uiSchema?.['x-component-props']?.step;
    if (value != null && !_.isUndefined(step)) {
      const s = step.toString();
      const precision = s.split('.')[1]?.length || 0;
      const num = Number(value);
      if (precision > 0) {
        const factor = Math.pow(10, precision);
        const rounded = Math.round(num * factor) / factor;
        return rounded.toFixed(precision);
      }
      return num.toFixed(0);
    }
    return value;
  }
}
