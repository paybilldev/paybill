import { BaseInterface } from './base-interface';

export class ToOneInterface extends BaseInterface {
  toString(value: any, ctx?: any): string {
    return value;
  }

  async toValue(str: string, ctx?: any) {
    if (!str) {
      return null;
    }

    const { filterKey, associationField, targetCollection, transaction } = ctx;

    const targetInstance = await targetCollection.repository.findOne({
      filter: {
        [filterKey]: str,
      },
      transaction,
    });

    if (!targetInstance) {
      throw new Error(`"${str}" not found in ${targetCollection.model.name} ${filterKey}`);
    }

    const targetKey = associationField.targetKey || targetCollection.model.primaryKeyAttribute;

    return targetInstance[targetKey];
  }
}
