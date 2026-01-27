import Fastify from 'fastify';
import {buildApp} from '../src/app'; // your buildApp function

export async function buildTestApp() {
  const app = await buildApp();
  await app.ready();
  return app;
}
