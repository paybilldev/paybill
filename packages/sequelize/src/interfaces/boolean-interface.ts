import { BaseInterface } from './base-interface';

export class BooleanInterface extends BaseInterface {
  async toValue(value: string, ctx?: any): Promise<any> {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return !!value;
    }

    if (typeof value === 'string') {
      if (!value) {
        return false;
      }

      if (['1', 'y', 'yes', 'true'].includes(value.toLowerCase())) {
        return true;
      } else if (['0', 'n', 'no', 'false'].includes(value.toLowerCase())) {
        return false;
      }
    }

    throw new Error(`Invalid value - ${JSON.stringify(value)}`);
  }

  toString(value: any, ctx?: any) {
    const enumConfig = this.options.uiSchema?.enum || [];
    if (enumConfig?.length > 0) {
      const option = enumConfig.find((item) => item.value === value);
      return option?.label;
    } else {
      const label = value ? 'True' : value === null || value === undefined ? '' : 'False';
      if (ctx?.t) {
        return ctx.t(label, { ns: 'action-export' });
      }

      return label;
    }
  }
}
