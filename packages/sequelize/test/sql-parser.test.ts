import { type Select } from "node-sql-parser";
import { sqlParser } from "../src";

describe("sql parser", () => {
	it("should parse sql", function () {
		const sql = `select users.id as id from users`;
		const { ast } = sqlParser.parse(sql);
		const selectAst = ast as Select;
		const columns = selectAst.columns;
		const firstColumn = columns[0];

		expect(firstColumn["expr"]["table"]).toEqual("users");
		expect(firstColumn["expr"]["column"]).toEqual("id");
	});

	// it('should parse complex sql', function () {
	//   const sql = `select u.id, u.nickname, r.title, r.name from users u left join roles_users ru on ru.user_id = u.id left join roles r on ru.role_name=r.name`;
	//   const { ast } = sqlParser.parse(sql);
	// });
	//
	// it('should parse with subquery', function () {
	//   const sql = `with t as (select * from users), v as (select * from roles) select * from t, v where t.id = v.id;`;
	//   const { ast } = sqlParser.parse(sql);
	// });
});
