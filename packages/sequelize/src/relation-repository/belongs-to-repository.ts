import { BelongsTo } from 'sequelize';
import { SingleRelationRepository } from './single-relation-repository';

export class BelongsToRepository extends SingleRelationRepository {
  /**
   * @internal
   */
  async filterOptions(sourceModel) {
    const association = this.association as BelongsTo;

    return {
      // @ts-ignore
      [association.targetKey]: sourceModel.get(association.foreignKey),
    };
  }
}
