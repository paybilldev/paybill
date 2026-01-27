import mysql from 'mysql2';
import { BaseDialect } from './base-dialect';
import { Options } from '../sequelize';

export class MysqlDialect extends BaseDialect {
  static dialectName = 'mysql';

  getVersionGuard() {
    return {
      sql: 'select version() as version',
      get: (v: string) => {
        const m = /([\d+.]+)/.exec(v);
        return m[0];
      },
      version: '>=8.0.17',
    };
  }

  getSequelizeOptions(options: Options) {
    const dialectOptions: mysql.ConnectionOptions = {
      ...(options.dialectOptions || {}),
      multipleStatements: true,
    };

    options.dialectOptions = dialectOptions;
    return options;
  }
}
