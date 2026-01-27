import {
	Sequelize,
	ToManyValueParser,
} from "../../src";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mockDatabase } from "../../src/mock-database";

describe("number value parser", () => {
	let parser: ToManyValueParser;
	let db: Sequelize;

	beforeEach(async () => {
		db = await mockDatabase();
		await db.clean({ drop: true });
		db.collection({
			name: "posts",
			fields: [
				{
					type: "belongsToMany",
					name: "tags",
				},
				{
					type: "belongsToMany",
					name: "attachments",
					interface: "attachment",
				},
			],
		});
		db.collection({
			name: "attachments",
			fields: [],
		});
		db.collection({
			name: "tags",
			fields: [
				{
					type: "string",
					name: "name",
				},
			],
		});
		await db.sync();
		const tag = db.getRepository("tags");
		await tag.create({
			values: { name: "tag1" },
		});
	});

	afterEach(async () => {
		await db.close();
	});

	const setValue = async (value) => {
		const post = db.getCollection("posts");
		parser = new ToManyValueParser(post.getField("tags"), {
			column: {
				dataIndex: ["tags", "name"],
			},
		});
		await parser.setValue(value);
	};

	const setAttachment = async (value) => {
		const post = db.getCollection("posts");
		parser = new ToManyValueParser(post.getField("attachments"), {});
		await parser.setValue(value);
	};

	it("should be [1]", async () => {
		await setValue("tag1");
		expect(parser.errors.length).toBe(0);
		expect(parser.getValue()).toEqual([1]);
	});

	it("should be null", async () => {
		await setValue("tag2");
		expect(parser.errors.length).toBe(1);
		expect(parser.getValue()).toBeNull();
	});

	it("should be attachment", async () => {
		await setAttachment("https://www.example.com/images/logo.png");
		expect(parser.errors.length).toBe(0);
		expect(parser.getValue()).toMatchObject([
			{
				title: "logo.png",
				extname: ".png",
				filename: "logo.png",
				url: "https://www.example.com/images/logo.png",
			},
		]);
	});
});

describe("region", () => {
	let parser: ToManyValueParser;
	let db: Sequelize;

	beforeEach(async () => {
		db = await mockDatabase();
		await db.clean({ drop: true });
		db.collection({
			name: "users",
			fields: [
				{
					type: "belongsToMany",
					name: "region",
					target: "regions",
					interface: "region",
					targetKey: "code",
					sortBy: "level",
				},
			],
		});
		db.collection({
			name: "regions",
			autoGenId: false,
			fields: [
				{
					name: "code",
					type: "string",
					// unique: true,
					primaryKey: true,
				},
				{
					name: "name",
					type: "string",
				},
				{
					name: "parent",
					type: "belongsTo",
					target: "regions",
					targetKey: "code",
					foreignKey: "parentCode",
				},
				{
					name: "children",
					type: "hasMany",
					target: "regions",
					sourceKey: "code",
					foreignKey: "parentCode",
				},
				{
					name: "level",
					type: "integer",
				},
			],
		});
		await db.sync();
		const areas = [
			{
				code: "470101",
				name: "Mvita",
				cityCode: "4701",
				provinceCode: "47",
			},
			{
				code: "470102",
				name: "Kisauni",
				cityCode: "4701",
				provinceCode: "47",
			},
		];

		const cities = [
			{
				code: "4701",
				name: "Mombasa",
				provinceCode: "47",
			},
			{
				code: "4702",
				name: "Nyali",
				provinceCode: "47",
			},
		];

		const provinces = [
			{
				code: "47",
				name: "Mombasa County",
			},
			{
				code: "48",
				name: "Kwale County",
			},
		];
		const region = db.getModel("regions");
		await region.bulkCreate(
			provinces.map((item) => ({
				code: item.code,
				name: item.name,
				level: 1,
			})),
		);
		await region.bulkCreate(
			cities.map((item) => ({
				code: item.code,
				name: item.name,
				level: 2,
				parentCode: item.provinceCode,
			})),
		);
		await region.bulkCreate(
			areas.map((item) => ({
				code: item.code,
				name: item.name,
				level: 3,
				parentCode: item.cityCode,
			})),
		);
	});

	afterEach(async () => {
		await db.close();
	});

	const setValue = async (value) => {
		const r = db.getCollection("users");
		parser = new ToManyValueParser(r.getField("region"), {});
		await parser.setValue(value);
	};

	it("should be correct", async () => {
		await setValue("Mombasa County/Mombasa");
		expect(parser.errors.length).toBe(0);
		expect(parser.getValue()).toEqual(["47", "4701"]);

		await setValue("Mombasa County / Mombasa");
		expect(parser.errors.length).toBe(0);
		expect(parser.getValue()).toEqual(["47", "4701"]);

		await setValue("Mombasa County / Nyali");
		expect(parser.errors.length).toBe(0);
		expect(parser.getValue()).toEqual(["47", "4702"]);
	});

	it("should be null", async () => {
		await setValue("Nairobi County / Westlands");
		expect(parser.errors.length).toBe(1);
		expect(parser.getValue()).toBeNull();

		await setValue("Mombasa County / UnknownArea");
		expect(parser.errors.length).toBe(1);
		expect(parser.getValue()).toBeNull();
	});
});
