import {FastifyInstance} from 'fastify';

export async function createSession(app: FastifyInstance, data: any) {
  const Session = app.sequelize.getCollection('sessions').model;
  return await Session.create(data);
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

export async function createOAuthConsent(app: FastifyInstance, data: any) {
  const OAuthConsentModel = app.sequelize.getCollection('oauth_consents').model; // or whatever your collection name is
  return await OAuthConsentModel.create(data);
}
