import { NumberInterface } from './number-interface';
import { percent2float } from '../utils/general';
import { toFixedByStep } from '../utils/number';

export class PercentInterface extends NumberInterface {
  parseValue(value) {
    if (typeof value === 'string' && value.endsWith('%')) {
      const parsedValue = percent2float(value);
      return parsedValue;
    }

    return value;
  }

  toString(value) {
    const step = this.options?.uiSchema?.['x-component-props']?.['step'] ?? 0;
    return value && `${toFixedByStep(value * 100, step)}%`;
  }
}
