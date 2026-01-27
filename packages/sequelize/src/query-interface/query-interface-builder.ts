import Sequelize from '../sequelize';
import MysqlQueryInterface from './mysql-query-interface';
import PostgresQueryInterface from './postgres-query-interface';
import SqliteQueryInterface from './sqlite-query-interface';

export default function buildQueryInterface(db: Sequelize) {
  const map = {
    mysql: MysqlQueryInterface,
    mariadb: MysqlQueryInterface,
    postgres: PostgresQueryInterface,
    sqlite: SqliteQueryInterface,
  };

  if (db.isPostgresCompatibleDialect()) {
    return new PostgresQueryInterface(db);
  }

  const dialect = db.options.dialect;

  if (!map[dialect]) {
    return null;
  }

  return new map[db.options.dialect](db);
}
