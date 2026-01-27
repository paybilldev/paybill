import { DataTypes } from 'sequelize';
import { BaseColumnFieldOptions, Field } from './field';
import { v4 as uuidv4 } from 'uuid';

export class UuidField extends Field {
  get dataType() {
    return DataTypes.UUID;
  }

  init() {
    const { name, autoFill } = this.options;

    this.listener = async (instances) => {
      instances = Array.isArray(instances) ? instances : [instances];
      for (const instance of instances) {
        const value = instance.get(name);

        if (!value && autoFill !== false) {
          instance.set(name, uuidv4());
        }
      }
    };
  }

  bind() {
    super.bind();
    // https://sequelize.org/docs/v6/other-topics/hooks/
    this.on('beforeValidate', this.listener);
    this.on('beforeBulkCreate', this.listener);
    this.on('beforeCreate', this.listener);
  }

  unbind() {
    super.unbind();
    this.off('beforeValidate', this.listener);
    this.off('beforeBulkCreate', this.listener);
    this.off('beforeCreate', this.listener);
  }
}

export interface UUIDFieldOptions extends BaseColumnFieldOptions {
  type: 'uuid';
  autoFill?: boolean;
}
