import { Sequelize, Options } from "./sequelize";
import { customAlphabet } from "nanoid";
import * as path from "path";

export class MockDatabase extends Sequelize {
	constructor(options: Options) {
		super({
			// SQLITE
			// storage: ":memory:",
			// dialect: "sqlite",

			// // MYSQL
			dialect: 'mysql', // default to MySQL
			host: '127.0.0.1', // optional, adjust as needed
			port: 3306,        // optional, adjust as needed
			username: 'root',  // optional
			password: 'password',      // optional
			database: 'test',  // default database

			// // PostgreSQL
			// dialect: 'postgres', // default to PostreSQL
			// host: '127.0.0.1', // optional, adjust as needed
			// port: 5432,        // optional, adjust as needed
			// username: 'postgres',  // optional
			// password: 'postgres',      // optional
			// database: 'test',  // default database

			...options,
		});
	}
}

interface TestDatabaseOptions extends Options {
	distributor_port?: number;
}

export function mockDatabase(options: TestDatabaseOptions = {}): MockDatabase {
	 
	let db: any;

	if (options.tablePrefix) {
		let configKey = "database";
		if (options.dialect === "sqlite") {
			configKey = "storage";
		} else {
			configKey = "database";
		}

		const shouldChange = () => {
			if (options.dialect === "sqlite") {
				return !options[configKey].includes(options.tablePrefix);
			}

			return !options[configKey].startsWith(options.tablePrefix);
		};

		if (options[configKey] && shouldChange()) {
			const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 10);

			const instanceId = `d_${nanoid()}`;
			const databaseName = `${options.tablePrefix}_${instanceId}`;

			if (options.dialect === "sqlite") {
				options.storage = path.resolve(
					path.dirname(options.storage),
					databaseName,
				);
			} else {
				options.database = databaseName;
			}
		}

		if (options.distributor_port) {
			options.hooks = options.hooks || {};

			options.hooks.beforeConnect = async (config) => {
				const url = `http://127.0.0.1:${options.distributor_port}/acquire?via=${db.instanceId}&name=${config.database}`;
				await fetch(url);
			};
		}
	}

	db = new MockDatabase(options);
	return db as MockDatabase;
}
