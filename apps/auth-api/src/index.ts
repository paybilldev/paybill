import {buildApp} from './app.js';

const port = Number.parseInt(process.env.PORT ?? '5000', 10);
const host = process.env.HOST ?? '0.0.0.0';

async function start() {
  try {
    const server = await buildApp();

    await server.listen({port, host});

    server.log.info(`Platform API listening on http://${host}:${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

void start();
