import { BaseDialect } from './base-dialect';

export class SqliteDialect extends BaseDialect {
  static dialectName = 'sqlite';

  getVersionGuard() {
    return {
      sql: 'select sqlite_version() as version',
      get: (v: string) => v,
      version: '3.x',
    };
  }
}
