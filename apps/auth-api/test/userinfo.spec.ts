import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import supertest from 'supertest';
import {buildTestApp} from './utils';
import {v4 as uuidv4} from 'uuid';
import {SignJWT, Scope} from '../src/services/oauth';
import {createSession, createUser} from './test-helpers';

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

describe(`GET ${prefix}/oauth/userinfo`, () => {
  let user: any;
  let session: any;
  let token: string;

  beforeEach(async () => {
    const uniqueId = uuidv4(); // generate unique identifier for this test run
    const uniquePhone = `+1555${Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, '0')}`; // ensure unique phone

    user = await createUser(app, {
      email: `user-${uniqueId}@example.com`,
      phone: uniquePhone,
      user_metadata: {
        name: 'John Doe',
        picture: 'https://example.com/avatar.png',
        preferred_username: 'johnd',
      },
      email_confirmed_at: new Date(),
      phone_confirmed_at: new Date(),
    });

    session = await createSession(app, {
      user_id: user.id,
      scopes: 'openid email profile phone',
      aal: 'aal1',
    });

    token = await SignJWT(app.jwtConfig, {
      sub: user.id,
      aud: 'authenticated',
      iss: 'auth',
      scope: session.scopes,
      session_id: session.id,
      email: user.email,
      phone: user.phone,
      user_metadata: user.user_metadata,
      app_metadata: {},
      role: 'authenticated',
      is_anonymous: false,
    });
  });

  it('returns 401 without Authorization header', async () => {
    const res = await supertest(app.server).get(`${prefix}/oauth/userinfo`);
    expect(res.status).toBe(401);
  });

  it('returns minimal response with only sub when no scopes', async () => {
    const noScopeToken = await SignJWT(app.jwtConfig, {
      sub: user.id,
      aud: 'authenticated',
      iss: 'auth',
      scope: '',
      session_id: session.id,
      is_anonymous: false,
    });

    const res = await supertest(app.server)
      .get(`${prefix}/oauth/userinfo`)
      .set('Authorization', `Bearer ${noScopeToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({sub: user.id});
  });

  it('returns email claims when email scope is present', async () => {
    const emailToken = await SignJWT(app.jwtConfig, {
      sub: user.id,
      aud: 'authenticated',
      iss: 'auth',
      scope: 'email',
      session_id: session.id,
      email: user.email,
      is_anonymous: false,
    });

    const res = await supertest(app.server)
      .get(`${prefix}/oauth/userinfo`)
      .set('Authorization', `Bearer ${emailToken}`);

    expect(res.body.email).toBe(user.email);
    expect(res.body.email_verified).toBe(true);
  });

  it('returns profile claims when profile scope is present', async () => {
    const profileToken = await SignJWT(app.jwtConfig, {
      sub: user.id,
      aud: 'authenticated',
      iss: 'auth',
      scope: 'profile',
      session_id: session.id,
      user_metadata: user.user_metadata,
      is_anonymous: false,
    });

    const res = await supertest(app.server)
      .get(`${prefix}/oauth/userinfo`)
      .set('Authorization', `Bearer ${profileToken}`);

    expect(res.body.name).toBe('John Doe');
    expect(res.body.picture).toBe('https://example.com/avatar.png');
    expect(res.body.preferred_username).toBe('johnd');
    expect(res.body.user_metadata).toBeTruthy();
  });

  it('returns phone claims when phone scope is present', async () => {
    const phoneToken = await SignJWT(app.jwtConfig, {
      sub: user.id,
      aud: 'authenticated',
      iss: 'auth',
      scope: 'phone',
      session_id: session.id,
      phone: user.phone,
      is_anonymous: false,
    });

    const res = await supertest(app.server)
      .get(`${prefix}/oauth/userinfo`)
      .set('Authorization', `Bearer ${phoneToken}`);

    expect(res.body.phone).toBe(user.phone);
    expect(res.body.phone_verified).toBe(true);
  });

  it('returns full OIDC response when all scopes are present', async () => {
    const res = await supertest(app.server)
      .get(`${prefix}/oauth/userinfo`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.sub).toBe(user.id);
    expect(res.body.email).toBe(user.email);
    expect(res.body.email_verified).toBe(true);
    expect(res.body.phone).toBe(user.phone);
    expect(res.body.phone_verified).toBe(true);
    expect(res.body.name).toBe('John Doe');
    expect(res.body.picture).toBe('https://example.com/avatar.png');
    expect(res.body.preferred_username).toBe('johnd');
    expect(res.body.user_metadata).toBeTruthy();
  });

  it('rejects invalid token', async () => {
    const res = await supertest(app.server)
      .get(`${prefix}/oauth/userinfo`)
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(403);
  });
});
