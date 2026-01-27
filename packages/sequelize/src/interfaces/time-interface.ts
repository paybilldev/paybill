import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { BaseInterface } from './base-interface';
dayjs.extend(utc);
export class TimeInterface extends BaseInterface {
  toValue(value: any, ctx?: any) {
    if (this.validate(value)) {
      const result = dayjs(value).format('HH:mm:ss');
      return result;
    }
    return value;
  }

  validate(value) {
    const result = dayjs(value).isValid();
    return result;
  }
}
