import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import supertest from 'supertest';
import {buildTestApp} from './utils';
import {v4 as uuidv4} from 'uuid';

import {
  createOAuthClient,
  createOAuthAuthorization,
  createUser,
} from './test-helpers';
import {hashSecret} from '../src/services';

let app: any;
const prefix = process.env.URL_PREFIX || '';

beforeEach(async () => {
  app = await buildTestApp();
  vi.useFakeTimers();
});

afterEach(async () => {
  await app.close();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe(`POST ${prefix}/oauth/token`, () => {
  let client: any;
  let publicClient: any;
  let user: any;
  let email: string;
  let phone: string;
  let authCode: string;

  beforeEach(async () => {
    email = `user-${uuidv4()}@example.com`;
    phone = `+1555${Math.floor(10000000 + Math.random() * 90000000)}`;
    authCode = uuidv4();

    user = await createUser(app, {email, phone, is_banned: false});

    // ✅ Use 'client_secret_post' so POST-body auth works
    client = await createOAuthClient(app, {
      id: uuidv4(),
      client_secret_hash: hashSecret('secret123'),
      token_endpoint_auth_method: 'client_secret_post', // ← critical fix
      grant_types: 'authorization_code refresh_token',
      redirect_uris: 'https://example.com/callback', // ← no trailing spaces
      client_type: 'confidential',
    });

    publicClient = await createOAuthClient(app, {
      id: uuidv4(),
      client_secret_hash: null,
      token_endpoint_auth_method: 'none',
      grant_types: 'authorization_code',
      redirect_uris: 'https://public.example.com/callback',
      client_type: 'public',
    });

    await createOAuthAuthorization(app, {
      id: uuidv4(),
      authorization_id: uuidv4(),
      client_id: client.id,
      user_id: user.id,
      authorization_code: authCode,
      scope: 'openid email profile',
      redirect_uri: 'https://example.com/callback', // ← clean URI
      status: 'approved',
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });
  });

  // --- Basic validation ---
  it('returns 400 if client_id is missing', async () => {
    const res = await supertest(app.server)
      .post(`${prefix}/oauth/token`)
      .send({grant_type: 'authorization_code', code: 'abc'});
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/client_id is required/);
  });

  it('returns 400 if client_id is not a valid UUID', async () => {
    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: 'not-a-uuid',
      grant_type: 'authorization_code',
      code: 'abc',
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/client_id must match format "uuid"/);
  });

  it('returns 400 if grant_type is missing', async () => {
    const res = await supertest(app.server)
      .post(`${prefix}/oauth/token`)
      .send({client_id: client.id, code: 'abc'});
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/must have required property 'grant_type'/);
  });

  it('returns 400 for unsupported grant_type', async () => {
    const res = await supertest(app.server)
      .post(`${prefix}/oauth/token`)
      .send({client_id: client.id, grant_type: 'password'});
    expect(res.status).toBe(400);
    // ✅ Fastify schema validation error
    expect(res.body.msg).toMatch(/must be equal to one of the allowed values/);
  });

  // --- Client auth methods ---
  it('accepts client credentials via POST body', async () => {
    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: client.id,
      client_secret: 'secret123',
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: 'https://example.com/callback',
    });
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeTruthy();
  });

  it('rejects Basic auth with invalid base64 or format', async () => {
    const res = await supertest(app.server)
      .post(`${prefix}/oauth/token`)
      .set('Authorization', 'Basic ###invalid###')
      .send({grant_type: 'authorization_code', code: 'abc'});
    expect(res.status).toBe(400);
    // ✅ Your handler returns "Invalid basic auth format" for both cases
    expect(res.body.msg).toMatch(/Invalid basic auth format/);
  });

  // --- Public vs Confidential clients ---
  it('allows public client with no secret', async () => {
    const code = uuidv4();
    await createOAuthAuthorization(app, {
      id: uuidv4(),
      authorization_id: uuidv4(),
      client_id: publicClient.id,
      user_id: user.id,
      authorization_code: code,
      scope: 'openid',
      redirect_uri: 'https://public.example.com/callback',
      status: 'approved',
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: publicClient.id,
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://public.example.com/callback',
    });
    expect(res.status).toBe(200);
  });

  it('rejects public client that provides client_secret', async () => {
    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: publicClient.id,
      client_secret: 'anything',
      grant_type: 'authorization_code',
      code: authCode,
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(
      /client is registered for 'none' but 'client_secret_post' was used/,
    );
  });

  it('rejects confidential client without client_secret', async () => {
    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: client.id,
      grant_type: 'authorization_code',
      code: authCode,
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(
      /client is registered for 'client_secret_post' but 'none' was used/,
    );
  });

  it('rejects wrong client_secret', async () => {
    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: client.id,
      client_secret: 'wrong',
      grant_type: 'authorization_code',
      code: authCode,
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/Invalid client credentials/);
  });

  // --- Authorization code flow ---
  it('issues tokens for valid authorization_code', async () => {
    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: client.id,
      client_secret: 'secret123',
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: 'https://example.com/callback',
    });
    expect(res.status).toBe(200);
    expect(res.body.token_type).toBe('Bearer');
    expect(res.body.expires_in).toBe(3600);
    expect(res.body.refresh_token).toBeTruthy();
    expect(res.headers['auth-user-id']).toBe(user.id);
  });

  it('includes id_token when openid scope is requested', async () => {
    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: client.id,
      client_secret: 'secret123',
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: 'https://example.com/callback',
    });
    expect(res.body.id_token).toBeTruthy();
  });

  it('rejects expired authorization code', async () => {
    const expiredCode = uuidv4();
    await createOAuthAuthorization(app, {
      id: uuidv4(),
      authorization_id: uuidv4(),
      client_id: client.id,
      user_id: user.id,
      authorization_code: expiredCode,
      scope: 'openid',
      redirect_uri: 'https://example.com/callback',
      status: 'approved',
      expires_at: new Date(Date.now() - 1000),
    });

    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: client.id,
      client_secret: 'secret123',
      grant_type: 'authorization_code',
      code: expiredCode,
      redirect_uri: 'https://example.com/callback',
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/Authorization code has expired/);
  });

  it('rejects code for wrong client', async () => {
    const otherClient = await createOAuthClient(app, {
      id: uuidv4(),
      client_secret_hash: hashSecret('other'),
      token_endpoint_auth_method: 'client_secret_post',
      grant_types: 'authorization_code',
      redirect_uris: 'https://other.com/callback',
      client_type: 'confidential',
    });

    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: otherClient.id,
      client_secret: 'other',
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: 'https://other.com/callback',
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(
      /Authorization code was not issued for this client/,
    );
  });

  it('rejects mismatched redirect_uri', async () => {
    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: client.id,
      client_secret: 'secret123',
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: 'https://evil.com/callback', // from your KB
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/Invalid redirect_uri/);
  });

  it('rejects request if user is banned', async () => {
    const bannedUser = await createUser(app, {
      email: `banned-${uuidv4()}@example.com`,
      banned_until: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });
    const bannedCode = uuidv4();
    await createOAuthAuthorization(app, {
      id: uuidv4(),
      authorization_id: uuidv4(),
      client_id: client.id,
      user_id: bannedUser.id,
      authorization_code: bannedCode,
      scope: 'openid',
      redirect_uri: 'https://example.com/callback',
      status: 'approved',
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: client.id,
      client_secret: 'secret123',
      grant_type: 'authorization_code',
      code: bannedCode,
      redirect_uri: 'https://example.com/callback',
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/User is banned/);
  });

  // --- Refresh token flow ---
  it('issues new tokens for valid refresh_token', async () => {
    const firstRes = await supertest(app.server)
      .post(`${prefix}/oauth/token`)
      .send({
        client_id: client.id,
        client_secret: 'secret123',
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: 'https://example.com/callback',
      });
    const refreshToken = firstRes.body.refresh_token;

    const secondRes = await supertest(app.server)
      .post(`${prefix}/oauth/token`)
      .send({
        client_id: client.id,
        client_secret: 'secret123',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.refresh_token).not.toBe(refreshToken);
  });

  it('rejects invalid refresh_token format', async () => {
    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: client.id,
      client_secret: 'secret123',
      grant_type: 'refresh_token',
      refresh_token: 'invalid.b64',
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/Refresh token length invalid/);
  });

  it('rejects refresh_token for banned user', async () => {
    const firstRes = await supertest(app.server)
      .post(`${prefix}/oauth/token`)
      .send({
        client_id: client.id,
        client_secret: 'secret123',
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: 'https://example.com/callback',
      });
    const refreshToken = firstRes.body.refresh_token;

    await user.update({banned_until: new Date(Date.now() + 1000)});

    const res = await supertest(app.server).post(`${prefix}/oauth/token`).send({
      client_id: client.id,
      client_secret: 'secret123',
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/User is banned/);
  });
});
