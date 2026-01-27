import { DateField } from './date-field';
import { BaseColumnFieldOptions } from './field';

export class DatetimeTzField extends DateField {}

export interface DatetimeTzFieldOptions extends BaseColumnFieldOptions {
  type: 'datetimeTz';
}
