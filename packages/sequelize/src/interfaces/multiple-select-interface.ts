import { BaseInterface } from './base-interface';
import { default as _ } from 'lodash';

export class MultipleSelectInterface extends BaseInterface {
  async toValue(str: string, ctx?: any): Promise<any> {
    const items = this.castArray(str);
    const enumConfig = this.options.uiSchema?.enum || [];
    return items.map((item) => {
      const option = enumConfig.find((option) => option.label === item);
      if (option) {
        return option.value;
      }

      const valueOption = enumConfig.find((option) => option.value === item);
      if (valueOption) {
        return valueOption.value;
      }

      throw new Error(`"${item}" is not a valid option in ${ctx.field.name} field.`);
    });
  }

  toString(value: any, ctx?: any) {
    const enumConfig = this.options.uiSchema?.enum || [];

    return _
      .castArray(value)
      .map((value) => {
        const option = enumConfig.find((item) => item.value === value);

        if (option) {
          if (ctx?.t) {
            return ctx.t(option.label, { ns: 'lm-collections' });
          }

          return option.label;
        }

        return value;
      })
      .join(',');
  }
}
