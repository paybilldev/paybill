import { BaseColumnFieldOptions, Field } from './field';
import { DataTypes } from 'sequelize';

export class DateOnlyField extends Field {
  get dataType(): any {
    return DataTypes.DATEONLY;
  }
}

export interface DateOnlyFieldOptions extends BaseColumnFieldOptions {
  type: 'dateOnly';
}
