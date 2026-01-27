import { Options } from '../sequelize';
import { BaseDialect } from './base-dialect';

export class MariadbDialect extends BaseDialect {
  static dialectName = 'mariadb';

  getSequelizeOptions(options: Options) {
    options.dialectOptions = {
      ...(options.dialectOptions || {}),
      multipleStatements: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
    };
    return options;
  }

  getVersionGuard() {
    return {
      sql: 'select version() as version',
      get: (v: string) => {
        const m = /([\d+.]+)/.exec(v);
        return m[0];
      },
      version: '>=10.9',
    };
  }
}
