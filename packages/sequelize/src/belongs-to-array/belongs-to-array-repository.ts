import { default as _ } from 'lodash';
import { Transactionable } from 'sequelize/types';
import { Collection } from '../collection';
import { transactionWrapperBuilder } from '../decorators/transaction-decorator';
import { FindOptions } from '../repository';
import { MultipleRelationRepository } from '../relation-repository/multiple-relation-repository';
import Sequelize from '../sequelize';
import { Model } from '../model';

const transaction = transactionWrapperBuilder(function () {
  return this.collection.model.sequelize.transaction();
});

export class BelongsToArrayAssociation {
  db: Sequelize;
  associationType: string;
  source: Model;
  foreignKey: string;
  targetName: string;
  targetKey: string;
  identifierField: string;
  as: string;
  options: any;

  constructor(options: {
    db: Sequelize;
    source: Model;
    as: string;
    foreignKey: string;
    target: string;
    targetKey: string;
  }) {
    const { db, source, as, foreignKey, target, targetKey } = options;
    this.options = options;
    this.associationType = 'BelongsToArray';
    this.db = db;
    this.source = source;
    this.foreignKey = foreignKey;
    this.targetName = target;
    this.targetKey = targetKey;
    this.identifierField = 'undefined';
    this.as = as;
  }

  get target() {
    return this.db.getModel(this.targetName);
  }

  generateInclude(parentAs?: string) {
    const targetCollection = this.db.getCollection(this.targetName);
    const targetField = targetCollection.getField(this.targetKey);
    const sourceCollection = this.db.getCollection(this.source.name);
    const foreignField = sourceCollection.getField(this.foreignKey);
    const queryInterface = this.db.sequelize.getQueryInterface();
    const asLeft = parentAs ? `${parentAs}->${this.as}` : this.as;
    const asRight = parentAs || this.source.collection.name;
    const left = queryInterface.quoteIdentifiers(`${asLeft}.${targetField.columnName()}`);
    const right = queryInterface.quoteIdentifiers(`${asRight}.${foreignField.columnName()}`);
    return {
      on: this.db.queryInterface.generateJoinOnForJSONArray(left, right),
    };
  }
}

export class BelongsToArrayRepository extends MultipleRelationRepository {
  private belongsToArrayAssociation: BelongsToArrayAssociation;

  constructor(sourceCollection: Collection, association: string, sourceKeyValue: string | number) {
    super(sourceCollection, association, sourceKeyValue);

    this.belongsToArrayAssociation = this.association as any as BelongsToArrayAssociation;
  }

  protected getInstance(options: Transactionable) {
    return this.sourceCollection.repository.findOne({
      filterByTk: this.sourceKeyValue,
    });
  }

  @transaction()
  async find(options?: FindOptions): Promise<any> {
    const targetRepository = this.targetCollection.repository;
    const instance = await this.getInstance(options);
    const tks = instance.get(this.belongsToArrayAssociation.foreignKey);
    const targetKey = this.belongsToArrayAssociation.targetKey;

    const addFilter = {
      [targetKey]: tks,
    };

    if (options?.filterByTk) {
      addFilter[targetKey] = options.filterByTk;
    }

    const findOptions = {
      ..._.omit(options, ['filterByTk', 'where', 'values', 'attributes']),
      filter: {
        $and: [options.filter || {}, addFilter],
      },
    };

    return await targetRepository.find(findOptions);
  }
}
