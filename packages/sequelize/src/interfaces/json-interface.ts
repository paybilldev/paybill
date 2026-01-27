import { BaseInterface } from './base-interface';

export class JsonInterface extends BaseInterface {
  async toValue(value: string, ctx?: any): Promise<any> {
    return JSON.parse(value);
  }

  toString(value: any, ctx?: any) {
    return JSON.stringify(value);
  }
}
