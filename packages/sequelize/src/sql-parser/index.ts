import pkg from 'node-sql-parser';
const { Parser } = pkg;

export default new Parser();
export type { Parser as SQLParserTypes };
