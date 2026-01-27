import Sequelize from '../sequelize';
import { default as _ } from 'lodash';

export default class DatabaseUtils {
  constructor(public db: Sequelize) {}

  addSchema(tableName, schema?) {
    if (!this.db.inDialect('postgres')) return tableName;
    if (this.db.options.schema && !schema) {
      schema = this.db.options.schema;
    }

    if (schema) {
      // @ts-ignore
      tableName = this.db.sequelize.getQueryInterface().queryGenerator.addSchema({
        tableName,
        _schema: schema,
      });
    }

    return tableName;
  }

  quoteTable(tableName) {
    const queryGenerator = this.db.sequelize.getQueryInterface().queryGenerator;
    // @ts-ignore
    tableName = queryGenerator.quoteTable(_.isPlainObject(tableName) ? tableName : this.addSchema(tableName));

    return tableName;
  }

  schema() {
    if (!this.db.inDialect('postgres')) {
      return undefined;
    }

    return this.db.options.schema || 'public';
  }
}
