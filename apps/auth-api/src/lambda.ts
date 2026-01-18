import awsLambdaFastify from '@fastify/aws-lambda';
import {buildApp} from './app.js';
import type {APIGatewayProxyEvent, Context} from 'aws-lambda';

let proxy: any;

async function setup() {
  const app = await buildApp();
  await app.ready();
  proxy = awsLambdaFastify(app);
  return proxy;
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
) => {
  if (!proxy) {
    proxy = await setup();
  }

  return proxy(event, context);
};
