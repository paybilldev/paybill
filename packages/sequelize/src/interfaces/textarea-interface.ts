import { default as _ } from 'lodash';
import { BaseInterface } from './base-interface';

export class TextareaInterface extends BaseInterface {
  toValue(value) {
    if (value === null || value === undefined || typeof value === 'string') {
      return value;
    }

    if (this.validate(value)) {
      return value.toString();
    }
    throw new Error(`Invalid value ${value}, expected textarea value`);
  }

  validate(value): boolean {
    return _.isString(value) || _.isNumber(value);
  }
}
