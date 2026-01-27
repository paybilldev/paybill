import { DataTypes } from 'sequelize';
import { BaseColumnFieldOptions, Field, FieldContext } from './field';

export class StringField extends Field {
  get dataType() {
    if (this.options.length) {
      return DataTypes.STRING(this.options.length);
    }

    return DataTypes.STRING;
  }

  additionalSequelizeOptions() {
    const { name, trim, unique } = this.options;

    return {
      set(value) {
        if (unique && value === '') {
          value = null;
        }
        if (value == null) {
          this.setDataValue(name, null);
          return;
        }
        if (typeof value !== 'string') {
          value = value.toString();
        }
        this.setDataValue(name, trim ? value.trim() : value);
      },
    };
  }
}

export interface StringFieldOptions extends BaseColumnFieldOptions<'string'> {
  type: 'string';
  length?: number;
  trim?: boolean;
}
