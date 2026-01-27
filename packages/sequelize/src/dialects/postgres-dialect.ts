import semver from 'semver';
import { BaseDialect } from './base-dialect';

export class PostgresDialect extends BaseDialect {
  static dialectName = 'postgres';

  getSequelizeOptions(options: any) {
    if (!options.hooks) {
      options.hooks = {};
    }

    if (!options.hooks['afterConnect']) {
      options.hooks['afterConnect'] = [];
    }

    options.hooks['afterConnect'].push(async (connection) => {
      await connection.query('SET search_path TO public;');
    });

    return options;
  }

  getVersionGuard() {
    return {
      sql: 'select version() as version',
      get: (v: string) => {
        const m = /([\d+.]+)/.exec(v);
        return semver.minVersion(m[0]).version;
      },
      version: '>=10',
    };
  }
}
