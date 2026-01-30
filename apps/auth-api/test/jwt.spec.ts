// tests/jwt.test.ts
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import supertest from 'supertest';
import Fastify from 'fastify';
import jwtPlugin, {JWTConfiguration, JwtKeysDecoder} from '../src/plugins/jwt';
import wellKnownRoutes from '../src/routes/well-known';

let app: ReturnType<typeof Fastify>;
const prefix = process.env.URL_PREFIX || '';

// Mock keys for testing
const mockJWTKeys: JwtKeysDecoder = {
  key1: {
    privateKey: {kty: 'RSA', kid: 'key1', alg: 'RS256', n: 'dummy', e: 'AQAB'},
    publicKey: {
      kty: 'RSA',
      kid: 'key1',
      alg: 'RS256',
      use: 'sig',
      n: 'dummy',
      e: 'AQAB',
    },
  },
  key2: {
    privateKey: {kty: 'oct', kid: 'key2', alg: 'HS256', k: 'secret'},
    publicKey: null,
  },
};

// Custom JWT config for testing
const jwtConfigMock: JWTConfiguration = {
  secret: 'secret',
  exp: 3600,
  aud: 'authenticated',
  adminGroupName: 'admin',
  defaultGroupName: 'authenticated',
  adminRoles: [],
  issuer: 'http://localhost',
  keyID: 'key1',
  keys: mockJWTKeys,
  validMethods: ['RS256', 'HS256'],
};

// Helper to build Fastify test app with override config
async function buildTestApp(customConfig?: JWTConfiguration) {
  app = Fastify({logger: true});
  // Register your JWT plugin with optional override
  await app.register(jwtPlugin, customConfig);
  await app.register(wellKnownRoutes, {prefix: process.env.URL_PREFIX || '/'});
  await app.ready();
  return app;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  if (app) await app.close();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Well-Known Endpoints (Supertest) with JWT override', () => {
  it('returns only public non-HMAC keys from JWKS', async () => {
    app = await buildTestApp(jwtConfigMock);

    const res = await supertest(app.server).get(
      `${prefix}/.well-known/jwks.json`,
    );
    expect(res.status).toBe(200);
    expect(res.body.keys).toHaveLength(1);
    expect(res.body.keys[0].kid).toBe('key1');
  });

  it('returns valid OpenID configuration with registration endpoint', async () => {
    process.env.ALLOW_DYNAMIC_REGISTRATION = 'true';
    process.env.OAUTH_SERVER_ENABLED = 'true';
    app = await buildTestApp(jwtConfigMock);

    const res = await supertest(app.server).get(
      `${prefix}/.well-known/openid-configuration`,
    );
    expect(res.status).toBe(200);
    expect(res.body.issuer).toBe(jwtConfigMock.issuer);
    expect(res.body.registration_endpoint).toBe(
      'http://localhost/oauth/clients/register',
    );

    delete process.env.ALLOW_DYNAMIC_REGISTRATION;
    delete process.env.OAUTH_SERVER_ENABLED;
  });

  it('does not include registration endpoint if dynamic registration disabled', async () => {
    process.env.ALLOW_DYNAMIC_REGISTRATION = 'false';
    process.env.OAUTH_SERVER_ENABLED = 'false';
    app = await buildTestApp(jwtConfigMock);

    const res = await supertest(app.server).get(
      `${prefix}/.well-known/openid-configuration`,
    );
    expect(res.status).toBe(200);
    expect(res.body.registration_endpoint).toBeUndefined();

    delete process.env.ALLOW_DYNAMIC_REGISTRATION;
  });
});
