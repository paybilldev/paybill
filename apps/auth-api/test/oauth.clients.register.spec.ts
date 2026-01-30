import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import supertest from 'supertest';
import {buildTestApp} from './utils';
import {v4 as uuidv4} from 'uuid';
import {hashSecret} from '../src/services';

let app: any;
const prefix = process.env.URL_PREFIX || '';

beforeEach(async () => {
  process.env.OAUTH_SERVER_ALLOW_DYNAMIC_REGISTRATION = 'true';
  app = await buildTestApp();
});

afterEach(async () => {
  await app.close();
  vi.restoreAllMocks();
});

describe(`POST ${prefix}/oauth/clients/register`, () => {
  it('rejects when dynamic registration is disabled', async () => {
    process.env.OAUTH_SERVER_ALLOW_DYNAMIC_REGISTRATION = 'false';

    const res = await supertest(app.server)
      .post(`${prefix}/oauth/clients/register`)
      .send({
        client_name: 'My App',
        redirect_uris: ['https://example.com/callback'],
      });

    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/Dynamic client registration is not enabled/);
  });

  it('creates confidential client by default', async () => {
    const res = await supertest(app.server)
      .post(`${prefix}/oauth/clients/register`)
      .send({
        client_name: 'Confidential App',
        redirect_uris: ['https://example.com/callback'],
      });

    expect(res.status).toBe(201);
    expect(res.body.client_type).toBe('confidential');
    expect(res.body.token_endpoint_auth_method).toBe('client_secret_basic');
    expect(res.body.client_secret).toBeTruthy();
    expect(res.body.client_secret_hash).toBeTruthy();
  });

  it('creates public client when token_endpoint_auth_method is none', async () => {
    const res = await supertest(app.server)
      .post(`${prefix}/oauth/clients/register`)
      .send({
        client_name: 'Public SPA',
        redirect_uris: ['https://spa.example.com/callback'],
        token_endpoint_auth_method: 'none',
      });

    expect(res.status).toBe(201);
    expect(res.body.client_type).toBe('public');
    expect(res.body.token_endpoint_auth_method).toBe('none');
    expect(res.body.client_secret).toBeUndefined();
  });

  it('respects explicit client_type override', async () => {
    const res = await supertest(app.server)
      .post(`${prefix}/oauth/clients/register`)
      .send({
        client_name: 'Forced Public',
        client_type: 'public',
        redirect_uris: ['https://forced.example.com/callback'],
      });

    expect(res.status).toBe(201);
    expect(res.body.client_type).toBe('public');
    expect(res.body.token_endpoint_auth_method).toBe('none');
  });

  it('sets default grant types when omitted', async () => {
    const res = await supertest(app.server)
      .post(`${prefix}/oauth/clients/register`)
      .send({
        client_name: 'Default Grants App',
        redirect_uris: ['https://example.com/callback'],
      });

    expect(res.status).toBe(201);
    expect(res.body.grant_types).toContain('authorization_code');
    expect(res.body.grant_types).toContain('refresh_token');
  });

  it('persists hashed secret for confidential client', async () => {
    const res = await supertest(app.server)
      .post(`${prefix}/oauth/clients/register`)
      .send({
        client_name: 'Secret App',
        redirect_uris: ['https://example.com/callback'],
      });

    const client = res.body;

    const OAuthClientModel = app.sequelize.getCollection('oauth_clients').model;
    const dbClient = await OAuthClientModel.findOne({where: {id: client.id}});

    expect(dbClient.client_secret_hash).toBeTruthy();
    expect(dbClient.client_secret_hash).not.toBe(client.client_secret);
    expect(dbClient.client_secret_hash).toBe(hashSecret(client.client_secret));
  });

  it('stores redirect_uris and grant_types as comma-separated strings', async () => {
    const res = await supertest(app.server)
      .post(`${prefix}/oauth/clients/register`)
      .send({
        client_name: 'Storage App',
        redirect_uris: ['https://a.com/cb', 'https://b.com/cb'],
        grant_types: ['authorization_code'],
      });

    const OAuthClientModel = app.sequelize.getCollection('oauth_clients').model;
    const dbClient = await OAuthClientModel.findOne({where: {id: res.body.id}});

    expect(dbClient.redirect_uris).toBe('https://a.com/cb,https://b.com/cb');
    expect(dbClient.grant_types).toBe('authorization_code');
  });
});
