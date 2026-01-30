import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import supertest from 'supertest';
import {buildTestApp} from './utils';
import {v4 as uuidv4} from 'uuid';
import {SignJWT} from '../src/services/oauth';
import {
  createUser,
  createOAuthClient,
  createOAuthAuthorization,
  createSession,
  createOAuthConsent,
} from './test-helpers';
import {hashSecret} from '../src/services';

let app: any;
const prefix = process.env.URL_PREFIX || '';

beforeEach(async () => {
  process.env.SITE_URL = 'https://example.com';
  app = await buildTestApp();
  vi.useFakeTimers();
});

afterEach(async () => {
  await app.close();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe(`GET ${prefix}/oauth/authorizations/:authorization_id`, () => {
  let user: any;
  let client: any;
  let token: string;
  let session: any;
  let OAuthAuthorizationModel: any;
  let OAuthConsentModel: any;

  beforeEach(async () => {
    OAuthAuthorizationModel = app.sequelize.getCollection(
      'oauth_authorizations',
    ).model;
    OAuthConsentModel = app.sequelize.getCollection('oauth_consents').model;

    const email = `user-${uuidv4()}@example.com`;
    user = await createUser(app, {email, is_banned: false});

    client = await createOAuthClient(app, {
      id: uuidv4(),
      client_secret_hash: hashSecret('secret123'),
      token_endpoint_auth_method: 'client_secret_post',
      grant_types: 'authorization_code',
      redirect_uris: 'https://example.com/callback',
      client_type: 'confidential',
    });

    session = await createSession(app, {
      user_id: user.id,
      scopes: 'openid email profile',
      aal: 'aal1',
    });

    token = await SignJWT(app.jwtConfig, {
      sub: user.id,
      aud: 'authenticated',
      iss: 'auth',
      scope: 'openid email profile',
      session_id: session.id,
      email: user.email,
      user_metadata: user.user_metadata || {},
      role: 'authenticated',
      is_anonymous: false,
    });
  });

  // ✅ AUTHENTICATION TESTS
  it('returns 401 if no authentication token provided', async () => {
    const auth = await createOAuthAuthorization(app, {
      id: uuidv4(),
      authorization_id: uuidv4(),
      client_id: client.id,
      user_id: null,
      authorization_code: uuidv4(),
      scope: 'openid',
      redirect_uri: 'https://example.com/callback',
      status: 'pending',
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await supertest(app.server).get(
      `${prefix}/oauth/authorizations/${auth.authorization_id}`,
    );
    expect(res.status).toBe(401);
    expect(res.body.msg).toContain('Bearer token');
  });

  it('returns 400 for invalid Origin header', async () => {
    const auth = await createOAuthAuthorization(app, {
      id: uuidv4(),
      authorization_id: uuidv4(),
      client_id: client.id,
      user_id: user.id,
      authorization_code: uuidv4(),
      scope: 'openid',
      redirect_uri: 'https://example.com/callback',
      status: 'pending',
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await supertest(app.server)
      .get(`${prefix}/oauth/authorizations/${auth.authorization_id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://malicious.com');

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe('unauthorized request origin');
  });

  // ✅ FIRST VISIT TESTS (user_id = null)
  it('associates user on first visit and returns Authorization details (no consent)', async () => {
    const firstVisitAuth = await createOAuthAuthorization(app, {
      id: uuidv4(),
      authorization_id: uuidv4(),
      client_id: client.id,
      user_id: null, // Critical: first visit
      authorization_code: uuidv4(),
      scope: 'openid email profile',
      redirect_uri: 'https://example.com/callback',
      status: 'pending',
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await supertest(app.server)
      .get(`${prefix}/oauth/authorizations/${firstVisitAuth.authorization_id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://example.com');

    expect(res.status).toBe(200);
    expect(res.body.authorization_id).toBe(firstVisitAuth.authorization_id);
    expect(res.body.client.id).toBe(client.id);
    expect(res.body.scope).toBe('openid email profile');
    expect(res.body).not.toHaveProperty('redirect_url'); // Not auto-approved

    // Verify DB: user_id was associated
    const updatedAuth = await OAuthAuthorizationModel.findByPk(
      firstVisitAuth.id,
    );
    expect(updatedAuth.user_id).toBe(user.id);
    expect(updatedAuth.status).toBe('pending');
  });

  it('auto-approves and redirects when valid consent exists', async () => {
    // ✅ CREATE CONSENT BEFORE REQUEST (critical fix)
    await createOAuthConsent(app, {
      user_id: user.id,
      client_id: client.id,
      scopes: 'openid email profile', // Must cover auth scope
      revoked_at: null,
    });

    const autoApproveAuth = await createOAuthAuthorization(app, {
      id: uuidv4(),
      authorization_id: uuidv4(),
      client_id: client.id,
      user_id: null, // First visit
      authorization_code: uuidv4(),
      scope: 'openid email profile',
      redirect_uri: 'https://example.com/callback',
      status: 'pending',
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await supertest(app.server)
      .get(`${prefix}/oauth/authorizations/${autoApproveAuth.authorization_id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://example.com');

    // ✅ Verify auto-approve response structure
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('redirect_url'); // NOT redirect_uri!
    expect(res.body.redirect_url).toMatch(
      /^https:\/\/example\.com\/callback\?/,
    );
    expect(res.body.redirect_url).toContain('code=');
    expect(res.body.redirect_url).not.toContain('error');

    // ✅ Verify DB state changed
    const updatedAuth = await OAuthAuthorizationModel.findByPk(
      autoApproveAuth.id,
    );
    expect(updatedAuth.user_id).toBe(user.id);
    expect(updatedAuth.status).toBe('approved');
    expect(updatedAuth.authorization_code).toBeTruthy();
    expect(updatedAuth.authorization_code).not.toBe(
      autoApproveAuth.authorization_code,
    );
    expect(updatedAuth.approved_at).toBeTruthy();
  });

  it('does not auto-approve with revoked consent', async () => {
    // ✅ Create REVOKED consent
    await createOAuthConsent(app, {
      user_id: user.id,
      client_id: client.id,
      scopes: 'openid email profile',
      revoked_at: new Date(), // Critical: revoked
    });

    const auth = await createOAuthAuthorization(app, {
      id: uuidv4(),
      authorization_id: uuidv4(),
      client_id: client.id,
      user_id: null,
      authorization_code: uuidv4(),
      scope: 'openid email profile',
      redirect_uri: 'https://example.com/callback',
      status: 'pending',
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await supertest(app.server)
      .get(`${prefix}/oauth/authorizations/${auth.authorization_id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://example.com');

    // Returns normal details (not redirect)
    expect(res.status).toBe(200);
    expect(res.body.authorization_id).toBe(auth.authorization_id);
    expect(res.body).not.toHaveProperty('redirect_url');

    // Verify DB: user associated but NOT approved
    const updatedAuth = await OAuthAuthorizationModel.findByPk(auth.id);
    expect(updatedAuth.user_id).toBe(user.id);
    expect(updatedAuth.status).toBe('pending');
  });

  // ✅ SUBSEQUENT VISIT TESTS (user_id already set)
  it('returns Authorization details for subsequent visit (user owns auth)', async () => {
    // Create auth WITH user_id pre-associated (simulating prior visit)
    const ownedAuth = await createOAuthAuthorization(app, {
      id: uuidv4(),
      authorization_id: uuidv4(),
      client_id: client.id,
      user_id: user.id, // Pre-associated
      authorization_code: uuidv4(),
      scope: 'openid email profile',
      redirect_uri: 'https://example.com/callback',
      status: 'pending',
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await supertest(app.server)
      .get(`${prefix}/oauth/authorizations/${ownedAuth.authorization_id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://example.com');

    expect(res.status).toBe(200);
    expect(res.body.authorization_id).toBe(ownedAuth.authorization_id);
    expect(res.body.client.id).toBe(client.id);
    expect(res.body.user.id).toBe(user.id);
  });

  it('returns 404 when Authorization belongs to another user', async () => {
    const otherUser = await createUser(app, {
      email: `other-${uuidv4()}@example.com`,
    });

    // Create auth OWNED BY OTHER USER
    const otherUserAuth = await createOAuthAuthorization(app, {
      id: uuidv4(),
      authorization_id: uuidv4(),
      client_id: client.id,
      user_id: otherUser.id, // Critical: different user
      authorization_code: uuidv4(),
      scope: 'openid',
      redirect_uri: 'https://example.com/callback',
      status: 'pending',
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Request with CURRENT USER's token
    const res = await supertest(app.server)
      .get(`${prefix}/oauth/authorizations/${otherUserAuth.authorization_id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://example.com');

    expect(res.status).toBe(404); // ✅ Go returns 404 (not 400)
    expect(res.body.msg).toBe('Authorization not found');
  });

  // ✅ VALIDATION TESTS
  it('returns 404 for expired authorization', async () => {
    const expiredAuth = await createOAuthAuthorization(app, {
      id: uuidv4(),
      authorization_id: uuidv4(),
      client_id: client.id,
      user_id: user.id,
      authorization_code: uuidv4(),
      scope: 'openid',
      redirect_uri: 'https://example.com/callback',
      status: 'pending',
      expires_at: new Date(Date.now() - 1000), // Expired
    });

    const res = await supertest(app.server)
      .get(`${prefix}/oauth/authorizations/${expiredAuth.authorization_id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://example.com');

    expect(res.status).toBe(404); // ✅ Go returns 404 for expired
    expect(res.body.msg).toBe('Authorization not found');

    // Verify DB was updated
    const updatedAuth = await OAuthAuthorizationModel.findByPk(expiredAuth.id);
    expect(updatedAuth.status).toBe('expired');
  });

  it('returns 400 for non-pending Authorization status', async () => {
    const approvedAuth = await createOAuthAuthorization(app, {
      id: uuidv4(),
      authorization_id: uuidv4(),
      client_id: client.id,
      user_id: user.id,
      authorization_code: uuidv4(),
      scope: 'openid',
      redirect_uri: 'https://example.com/callback',
      status: 'approved', // Non-pending status
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await supertest(app.server)
      .get(`${prefix}/oauth/authorizations/${approvedAuth.authorization_id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://example.com');

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe('Authorization request cannot be processed');
  });

  it('returns 404 for non-existent Authorization ID', async () => {
    const res = await supertest(app.server)
      .get(`${prefix}/oauth/authorizations/${uuidv4()}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://example.com');

    expect(res.status).toBe(404);
    expect(res.body.msg).toBe('Authorization not found');
  });
});
