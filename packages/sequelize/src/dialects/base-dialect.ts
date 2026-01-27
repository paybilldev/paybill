import { Sequelize, Options } from '../sequelize';
import semver from 'semver';

export interface DialectVersionGuard {
  sql: string;
  get: (v: string) => string;
  version: string;
}

export abstract class BaseDialect {
  static dialectName: string;

  getSequelizeOptions(options: Options) {
    return options;
  }

  async checkDatabaseVersion(db: Sequelize): Promise<boolean> {
    const versionGuard = this.getVersionGuard();

    const result = await db.sequelize.query(versionGuard.sql, {
      type: 'SELECT',
    });

    // @ts-ignore
    const version = versionGuard.get(result?.[0]?.version);

    const versionResult = semver.satisfies(version, versionGuard.version);

    if (!versionResult) {
      throw new Error(
        `to use ${(this.constructor as typeof BaseDialect).dialectName}, please ensure the version is ${
          versionGuard.version
        }, current version is ${version}`,
      );
    }

    return true;
  }

  getVersionGuard(): DialectVersionGuard {
    throw new Error('not implemented');
  }
}
