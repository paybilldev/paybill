// test-helpers.ts
import {FastifyInstance} from 'fastify';
import {randomBytes, createHash, createHmac} from 'crypto';
import {Buffer} from 'buffer';

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest().toString('base64url');
}

export async function createOAuthClient(app: FastifyInstance, data: any) {
  const OAuthClientModel = app.sequelize.getCollection('oauth_clients').model;
  return await OAuthClientModel.create(data);
}

export async function createOAuthAuthorization(
  app: FastifyInstance,
  data: any,
) {
  const OAuthAuthorizationModel = app.sequelize.getCollection(
    'oauth_authorizations',
  ).model;
  return await OAuthAuthorizationModel.create(data);
}

export async function createUser(app: FastifyInstance, data: any) {
  const UserModel = app.sequelize.getCollection('users').model; // or whatever your collection name is
  return await UserModel.create(data);
}
