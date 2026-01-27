import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export async function requireResolve(m: any) {
  if (!process.env.VITEST) {
    return require.resolve(m);
  }
  const json = JSON.parse(
    await fs.promises.readFile(path.resolve(process.cwd(), './tsconfig.paths.json'), { encoding: 'utf8' }),
  );
  const paths = json.compilerOptions.paths;
  if (paths[m]) {
    return require.resolve(path.resolve(process.cwd(), paths[m][0], 'index.ts'));
  }
  return require.resolve(m);
}

export function requireModule(m: any) {
  if (typeof m === 'string') {
    m = require(m);
  }

  if (typeof m !== 'object') {
    return m;
  }

  return m.__esModule ? m.default : m;
}

export default requireModule;

export async function importModule(m: string) {
  if (!process.env.VITEST) {
    return requireModule(m);
  }

  if (path.isAbsolute(m)) {
    m = pathToFileURL(m).href;
  }

  const r = (await import(m)).default;
  return r.__esModule ? r.default : r;
}