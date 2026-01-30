import type {FastifyPluginAsync, FastifyReply, FastifyRequest} from 'fastify';
import {
  OAuthClientsBody,
  OAuthAuthorizationsAuthorizationIdConsentBody,
  OAuthTokenBody,
  OAuthClientResponse,
  OAuthAuthorizeQuery,
} from '../openapi/index.js';
import {
  decryptKey,
  encryptKey,
  generateClientSecret,
  generateHmacKey,
  generateRefreshToken,
  GrantParams,
  hashSecret,
  hasScope,
  IDTokenClaims,
  IsSupportedScope,
  parseScopeString,
  Scope,
  SignJWT,
} from '../services/oauth.js';
import {
  createHash,
  timingSafeEqual,
  createHmac,
  randomUUID,
  randomBytes,
} from 'crypto';
import {v4 as uuidv4} from 'uuid';
import {AuditAction} from '../model/AuditLogEntryModel.js';
import {requireAuthentication} from '../middleware/auth.js';
import {isRedirectURLValid} from '../utils/redirect.js';

const oauthServerRoutes: FastifyPluginAsync = async app => {
  // POST /clients/register
  app.post<{Body: OAuthClientsBody}>(
    '/clients/register',
    {
      schema: {
        summary: 'Register a new OAuth client dynamically (public endpoint)',
        tags: ['oauth-server'],
        body: {$ref: 'OAuthClientsBody'},
        response: {
          201: {$ref: 'OAuthClientResponse'},
          400: {$ref: 'BadRequestResponse'},
          429: {$ref: 'RateLimitResponse'},
        },
      },
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '5 minutes',
          keyGenerator: req =>
            req.headers['x-forwarded-for']?.toString() || req.ip,
          errorResponseBuilder: () => ({msg: 'Too many requests'}),
        },
      },
    },
    async (
      request: FastifyRequest<{Body: OAuthClientsBody}>,
      reply: FastifyReply,
    ) => {
      if (process.env.OAUTH_SERVER_ALLOW_DYNAMIC_REGISTRATION !== 'true') {
        return reply.status(400).send({
          msg: 'Dynamic client registration is not enabled',
        });
      }

      const body = request.body;
      body.registration_type = 'dynamic';

      // Set default grant types
      if (!body.grant_types || body.grant_types.length === 0) {
        body.grant_types = ['authorization_code', 'refresh_token'];
      }

      // Determine client type
      let clientType: 'public' | 'confidential' = 'confidential'; // default

      if (body.token_endpoint_auth_method) {
        switch (body.token_endpoint_auth_method) {
          case 'none':
            clientType = 'public';
            break;
          case 'client_secret_basic':
          case 'client_secret_post':
            clientType = 'confidential';
            break;
          default:
            clientType = 'confidential';
        }
      }

      // Apply explicit client_type if provided
      if (body.client_type) {
        clientType = body.client_type;
      }

      body.client_type = clientType;

      // Determine token_endpoint_auth_method defaults
      if (!body.token_endpoint_auth_method) {
        body.token_endpoint_auth_method =
          clientType === 'public' ? 'none' : 'client_secret_basic';
      }

      let plaintextSecret: string | undefined;
      if (body.client_type === 'confidential') {
        plaintextSecret = generateClientSecret();
        body.client_secret_hash = hashSecret(plaintextSecret);
      }

      // Save to database
      const OAuthClientModel =
        app.sequelize.getCollection('oauth_clients').model;

      const client = await OAuthClientModel.create({
        id: uuidv4(),
        registration_type: body.registration_type,
        client_type: body.client_type,
        token_endpoint_auth_method: body.token_endpoint_auth_method,
        client_name: body.client_name,
        client_uri: body.client_uri,
        logo_uri: body.logo_uri,
        redirect_uris: body.redirect_uris.join(','),
        grant_types: body.grant_types.join(','),
        client_secret_hash: body.client_secret_hash,
      });

      const plain = client.get({plain: true});

      const response: OAuthClientResponse = {
        ...plain,
        redirect_uris: plain.redirect_uris.split(','),
        grant_types: plain.grant_types.split(','),
        client_secret: plaintextSecret,
      };

      return reply.status(201).send(response);
    },
  );

  app.post<{
    Body: OAuthTokenBody;
  }>(
    '/token',
    {
      schema: {
        summary: 'OAuth 2.1 Token endpoint',
        description: `Issues access tokens in exchange for authorization codes or refresh tokens.
        Supports authorization_code and refresh_token grant types.
        Only available when OAuth server is enabled (set \`OAUTH_SERVER_ENABLED=true\` for self-hosted or enable in Dashboard).`,
        tags: ['oauth-server'],
        operationId: 'OAuthServerController_issueToken',
        body: {
          type: 'object',
          $ref: 'OAuthTokenBody',
        },
        response: {
          200: {
            description: 'Access token issued successfully',
            $ref: 'OAuthTokenResponse',
          },
          400: {$ref: 'BadRequestResponse'},
          401: {$ref: 'UnAuthorizedResponse'},
        },
      },
    },
    async (request, reply) => {
      const expirySeconds = Number(process.env.JWT_EXPIRY_SECONDS ?? 3600); // declare once
      // ---------------------
      // 1️⃣ Populate client credentials from Authorization header
      // ---------------------
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Basic ')) {
        const encodedAuth = authHeader.slice(6);
        let decodedAuth: string;
        try {
          decodedAuth = Buffer.from(encodedAuth, 'base64').toString('utf-8');
        } catch {
          return reply.status(400).send({msg: 'Invalid basic auth encoding'});
        }
        const [id, secret] = decodedAuth.split(':');
        if (!id || !secret) {
          return reply.status(400).send({msg: 'Invalid basic auth format'});
        }

        request.body.client_id ||= id;
        request.body.client_secret ||= secret;
        request.body.auth_method = 'client_secret_basic';
      } else {
        if (request.body.client_secret != null) {
          request.body.auth_method = 'client_secret_post';
        } else {
          request.body.auth_method = 'none';
        }
      }

      // ---------------------
      // 2️⃣ Revalidate client id
      // ---------------------
      if (request.body.client_id == null) {
        return reply.status(400).send({msg: 'client_id is required'});
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(request.body.client_id)) {
        return reply
          .status(400)
          .send({msg: 'client_id must match format "uuid"'});
      }

      // ---------------------
      // 3️⃣ Fetch client
      // ---------------------
      const OAuthClientModel =
        app.sequelize.getCollection('oauth_clients').model;
      const client = await OAuthClientModel.findOne({
        where: {id: request.body.client_id},
      });

      if (!client) {
        return reply.status(400).send({msg: 'Invalid client credentials'});
      }

      if (request.body.auth_method !== client.token_endpoint_auth_method) {
        return reply.status(400).send({
          msg: `client is registered for '${client.token_endpoint_auth_method}' but '${request.body.auth_method}' was used`,
        });
      }

      // ---------------------
      // 4️⃣ Validate client secret
      // ---------------------
      if (client.isPublic()) {
        if (request.body.client_secret != null) {
          return reply.status(400).send({
            msg: 'public clients must not provide client_secret',
          });
        }
      } else {
        if (!request.body.client_secret) {
          return reply.status(400).send({
            msg: 'Confidential clients must provide client_secret',
          });
        }

        try {
          const hash = createHash('sha256')
            .update(request.body.client_secret)
            .digest();
          const stored = Buffer.from(client.client_secret_hash, 'base64url');
          if (hash.length !== stored.length || !timingSafeEqual(hash, stored)) {
            return reply.status(400).send({msg: 'Invalid client credentials'});
          }
        } catch {
          return reply.status(400).send({msg: 'Invalid client credentials'});
        }
      }

      // ---------------------
      // 5️⃣ Grant type handling
      // ---------------------

      const SessionModel = app.sequelize.getCollection('sessions').model;
      const UserModel = app.sequelize.getCollection('users').model;

      switch (request.body.grant_type) {
        case 'authorization_code': {
          if (!request.body.code) {
            return reply.status(400).send({
              msg: 'code is required for authorization_code grant',
            });
          }

          const OAuthAuthorizationModel = app.sequelize.getCollection(
            'oauth_authorizations',
          ).model;
          const oauthAuthorization = await OAuthAuthorizationModel.findOne({
            where: {authorization_code: request.body.code, status: 'approved'},
          });

          if (!oauthAuthorization) {
            return reply
              .status(400)
              .send({msg: 'OAuth authorization not found'});
          }

          if (oauthAuthorization.isExpired()) {
            return reply
              .status(400)
              .send({msg: 'Authorization code has expired'});
          }

          if (oauthAuthorization.client_id !== client.id) {
            return reply.status(400).send({
              msg: 'Authorization code was not issued for this client',
            });
          }

          if (
            request.body.resource &&
            request.body.resource !== oauthAuthorization.resource
          ) {
            return reply.status(400).send({
              msg: 'Authorization code resource does not match the resource parameter',
            });
          }

          if (
            request.body.redirect_uri &&
            request.body.redirect_uri !== oauthAuthorization.redirect_uri
          ) {
            return reply.status(400).send({msg: 'Invalid redirect_uri'});
          }

          if (!oauthAuthorization.verifyPKCE(request.body.code_verifier)) {
            return reply.status(400).send({msg: 'PKCE verification failed'});
          }

          const authCodeUser = await UserModel.findOne({
            where: {id: oauthAuthorization.user_id},
          });

          if (!authCodeUser) {
            return reply
              .status(400)
              .send({msg: 'User not found for authorization code'});
          }

          if (authCodeUser.IsBanned()) {
            return reply.status(400).send({msg: 'User is banned'});
          }

          // --- session creation, token generation, audit log ---
          const grantParams = new GrantParams();
          grantParams.fillGrantParams(request);
          grantParams.oauth_client_id = client.id;
          grantParams.scopes = oauthAuthorization.scope;

          const AuditLogEntryModel =
            app.sequelize.getCollection('audit_log_entries').model;
          // @ts-ignore
          await AuditLogEntryModel.newAuditLogEntry(
            request,
            authCodeUser,
            AuditAction.Login,
            (request.ip as string) ||
              (request.headers['x-forwarded-for'] as string) ||
              '',
            {
              provider_type: 'oauth_provider_authorization_code',
              client_id: client.id,
            },
          );

          reply.header('auth-user-id', authCodeUser.id);
          authCodeUser.last_sign_in_at = new Date();

          const session = await SessionModel.create({
            id: uuidv4(),
            user_id: authCodeUser.id,
            factor_id: grantParams.factor_id,
            aal: 'aal1',
          });

          if (grantParams.session_not_after)
            session.not_after = grantParams.session_not_after;
          if (grantParams.user_agent)
            session.user_agent = grantParams.user_agent;
          if (grantParams.ip) session.ip = grantParams.ip;
          if (grantParams.session_tag) session.tag = grantParams.session_tag;
          if (grantParams.oauth_client_id)
            session.oauth_client_id = grantParams.oauth_client_id;
          if (grantParams.scopes) session.scopes = grantParams.scopes;

          const hmacKey = generateHmacKey();
          session.refresh_token_hmac_key = await encryptKey(hmacKey);
          session.refresh_token_counter = 0;
          session.refreshed_at = new Date();

          const refreshToken = await generateRefreshToken(session, hmacKey);
          await session.save();

          // --- handle OIDC id_token ---
          let idToken: string | undefined;
          const scopeList = parseScopeString(oauthAuthorization.scope);

          if (hasScope(scopeList, Scope.OpenID)) {
            const nonce = oauthAuthorization.nonce ?? undefined;
            const authTimeUnix = Math.floor(
              (authCodeUser.last_sign_in_at ?? new Date()).getTime() / 1000,
            );
            const issuedAtID = new Date();
            const expiresAtID = new Date(
              issuedAtID.getTime() + expirySeconds * 1000,
            );

            const idClaims: IDTokenClaims = {
              sub: authCodeUser.id,
              aud: client.id,
              iss: process.env.JWT_ISSUER ?? 'auth',
              iat: Math.floor(issuedAtID.getTime() / 1000),
              exp: Math.floor(expiresAtID.getTime() / 1000),
              auth_time: authTimeUnix,
              client_id: client.id,
            };

            if (nonce) idClaims.nonce = nonce;

            if (hasScope(scopeList, Scope.Email)) {
              idClaims.email = authCodeUser.email;
              idClaims.email_verified = authCodeUser.IsConfirmed() ?? false;
            }
            if (hasScope(scopeList, Scope.Phone)) {
              idClaims.phone_number = authCodeUser.phone;
              idClaims.phone_number_verified =
                authCodeUser.IsPhoneConfirmed() ?? false;
            }
            if (hasScope(scopeList, Scope.Profile)) {
              idClaims.name =
                authCodeUser.user_metadata?.name ??
                authCodeUser.email ??
                undefined;
              idClaims.picture =
                authCodeUser.user_metadata?.picture ??
                authCodeUser.user_metadata?.avatar_url ??
                undefined;
              idClaims.preferred_username =
                authCodeUser.user_metadata?.preferred_username ??
                authCodeUser.user_metadata?.username ??
                undefined;
              if (authCodeUser.updated_at) {
                idClaims.updated_at = Math.floor(
                  authCodeUser.updated_at.getTime() / 1000,
                );
              }
            }

            try {
              idToken = await SignJWT(app.jwtConfig, idClaims, 'id_token');
            } catch (err) {
              app.log.warn(
                'OIDC requested but no asymmetric key configured for ID tokens',
              );
              return reply.status(400).send({
                msg: 'OpenID Connect not supported: server lacks asymmetric signing key',
              });
            }
          }

          await oauthAuthorization.destroy();

          const accessToken = await SignJWT(
            app.jwtConfig,
            {
              sub: authCodeUser.id,
              aud: authCodeUser.aud,
              iss: process.env.JWT_ISSUER ?? 'auth',
              iat: Math.floor(new Date().getTime() / 1000),
              exp: Math.floor(new Date().getTime() / 1000) + expirySeconds,
              email: authCodeUser.email,
              phone: authCodeUser.phone,
              app_metadata: authCodeUser.app_metadata,
              user_metadata: authCodeUser.user_metadata,
              role: authCodeUser.role,
              session_id: session.id,
              is_anonymous: authCodeUser.is_anonymous,
              aal: 'aal1',
              amr: [],
              client_id: client.id,
              scope: session.scopes,
            },
            'access',
          );

          return reply.status(200).send({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: expirySeconds,
            refresh_token: refreshToken,
            ...(idToken ? {id_token: idToken} : {}),
          });
        }

        case 'refresh_token': {
          if (!request.body.refresh_token) {
            return reply.status(400).send({
              msg: 'refresh_token is required for refresh_token grant',
            });
          }

          let decodedToken: Buffer;
          try {
            decodedToken = Buffer.from(request.body.refresh_token, 'base64url');
          } catch {
            return reply.status(400).send({msg: 'Refresh token is not valid'});
          }

          // Validation
          if (decodedToken.length !== 45) {
            // 1 + 16 + 8 + 16 + 4
            return reply
              .status(400)
              .send({msg: 'Refresh token length invalid'});
          }

          const payloadWithSig = decodedToken.subarray(0, 41);
          const checksum = decodedToken.subarray(41, 45);
          const sessionIdBytes = decodedToken.subarray(1, 17);
          const counterBytes = decodedToken.subarray(17, 25);
          const signature = decodedToken.subarray(25, 41);

          // FIX: Checksum now correctly matches the generation logic
          const expectedChecksum = createHmac('sha256', Buffer.alloc(0))
            .update(payloadWithSig)
            .digest()
            .slice(0, 4);

          if (!timingSafeEqual(checksum, expectedChecksum)) {
            return reply
              .status(400)
              .send({msg: 'Invalid refresh token checksum'});
          }

          const sessionIdHex = Buffer.from(sessionIdBytes).toString('hex');
          const sessionIdFormatted = `${sessionIdHex.slice(0, 8)}-${sessionIdHex.slice(8, 12)}-${sessionIdHex.slice(12, 16)}-${sessionIdHex.slice(16, 20)}-${sessionIdHex.slice(20)}`;

          const session = await SessionModel.findOne({
            where: {id: sessionIdFormatted},
            include: [{model: UserModel, as: 'user'}],
          });

          if (!session || !session.user) {
            return reply.status(400).send({msg: 'Invalid refresh token'});
          }

          const refreshUser = session.user;
          if (refreshUser.IsBanned()) {
            return reply.status(400).send({msg: 'User is banned'});
          }

          let hmacKey: Buffer;
          try {
            hmacKey = await decryptKey(session.refresh_token_hmac_key);
          } catch {
            return reply.status(400).send({msg: 'Invalid refresh token'});
          }

          const expectedSignature = createHmac('sha256', hmacKey)
            .update(decodedToken.subarray(0, 25))
            .digest()
            .slice(0, 16);

          if (!timingSafeEqual(signature, expectedSignature)) {
            return reply
              .status(400)
              .send({msg: 'Invalid refresh token signature'});
          }

          const providedCounter = Number(
            decodedToken.subarray(17, 25).readBigUInt64BE(),
          );
          const currentCounter = session.refresh_token_counter;

          let newRefreshToken: string;
          if (providedCounter >= currentCounter) {
            // Rotate the token
            session.refresh_token_counter += 1;
            newRefreshToken = await generateRefreshToken(session, hmacKey);
          } else {
            // If client sends an old token, we could either reject or return current
            newRefreshToken = request.body.refresh_token;
          }

          session.refreshed_at = new Date();
          await session.save();

          const accessToken = await SignJWT(
            app.jwtConfig,
            {
              sub: refreshUser.id,
              aud: refreshUser.aud,
              iss: process.env.JWT_ISSUER ?? 'auth',
              iat: Math.floor(new Date().getTime() / 1000),
              exp: Math.floor(new Date().getTime() / 1000) + expirySeconds,
              email: refreshUser.email,
              phone: refreshUser.phone,
              app_metadata: refreshUser.app_metadata,
              user_metadata: refreshUser.user_metadata,
              role: refreshUser.role,
              session_id: session.id,
              is_anonymous: refreshUser.is_anonymous,
              aal: 'aal1',
              amr: [],
              client_id: client.id,
              scope: session.scopes,
            },
            'access',
          );

          reply.header('auth-session-id', session.id);
          reply.header('auth-user-id', refreshUser.id);
          reply.header(
            'auth-refresh-token-counter',
            session.refresh_token_counter.toString(),
          );

          return reply.status(200).send({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: expirySeconds,
            refresh_token: newRefreshToken,
          });
        }

        default:
          return reply.status(400).send({
            msg: `Unsupported grant type: ${request.body.grant_type}`,
          });
      }
    },
  );

  // GET /authorize
  app.get<{
    Querystring: OAuthAuthorizeQuery;
  }>(
    '/authorize',
    {
      schema: {
        summary: 'OAuth 2.1 Authorization endpoint',
        tags: ['oauth-server'],
        operationId: 'OAuthServerController_authorize',
        description:
          'Initiates the OAuth authorization code flow. Redirects users to login and authorize the requesting application. Only available when OAuth server is enabled (set `OAUTH_SERVER_ENABLED=true` for self-hosted or enable in Dashboard).',
        querystring: {$ref: 'OAuthAuthorizeQuery'},
        response: {
          302: {$ref: 'OAuthRedirectToLoginResponse'},
          400: {$ref: 'BadRequestResponse'},
        },
      },
    },
    async (request, reply) => {
      const {
        client_id,
        redirect_uri,
        response_type = 'code', // OAuth 2.1 requires 'code' - set default but validate strictly
        scope = 'email', // Use configured default
        state,
        resource,
        code_challenge,
        code_challenge_method,
        nonce,
      } = request.query;

      // Helper: Build error redirect URL with state preservation
      const buildErrorRedirect = (error: string, errorDescription: string) => {
        try {
          const url = new URL(redirect_uri);
          url.searchParams.set('error', error);
          url.searchParams.set('error_description', errorDescription);
          if (state) url.searchParams.set('state', state);
          return url.toString();
        } catch {
          // Fallback for malformed redirect_uri (shouldn't happen after Phase 1 validation)
          const params = new URLSearchParams({
            error,
            error_description: errorDescription,
            ...(state && {state}),
          });
          return `${redirect_uri.includes('?') ? '&' : '?'}${params.toString()}`;
        }
      };

      // ======================
      // PHASE 1: TRUSTED PARAM VALIDATION (NO REDIRECT ON ERROR)
      // ======================
      // Fetch client
      const OAuthClientModel =
        request.server.sequelize.getCollection('oauth_clients').model;
      const client = await OAuthClientModel.findOne({where: {id: client_id}});

      if (!client) {
        return reply
          .status(302)
          .redirect(
            buildErrorRedirect('server_error', 'Invalid client credentials'),
          );
      }

      // Validate redirect_uri EXACT MATCH against registered URIs (RFC 6749 §3.1.2)
      if (!client.redirect_uris.includes(redirect_uri)) {
        return reply
          .status(302)
          .redirect(
            buildErrorRedirect(
              'server_error',
              'redirect_uri does not match registered URIs',
            ),
          );
      }

      // ======================
      // PHASE 2: CLIENT-CONTROLLED PARAM VALIDATION (REDIRECT ERRORS)
      // ======================
      // Validate response_type (OAuth 2.1 ONLY supports 'code')
      if (response_type !== 'code') {
        return reply
          .status(302)
          .redirect(
            buildErrorRedirect(
              'unsupported_response_type',
              'Only response_type=code is supported per OAuth 2.1',
            ),
          );
      }

      // Validate scopes
      if (!scope || scope.trim() === '') {
        return reply
          .status(302)
          .redirect(
            buildErrorRedirect('invalid_scope', 'scope parameter is required'),
          );
      }

      const scopeList = scope.split(' ').filter(s => s.trim());
      for (const s of scopeList) {
        if (!IsSupportedScope(s)) {
          return reply
            .status(302)
            .redirect(
              buildErrorRedirect('invalid_scope', `Unsupported scope: ${s}`),
            );
        }
      }

      // Validate resource parameter (RFC 8707)
      if (resource) {
        try {
          const parsed = new URL(resource);
          if (!parsed.protocol || !parsed.host) {
            throw new Error('Not absolute URI');
          }
          if (parsed.hash) throw new Error('Contains fragment');
          if (parsed.search) throw new Error('Contains query');
        } catch {
          return reply
            .status(302)
            .redirect(
              buildErrorRedirect(
                'invalid_request',
                'resource must be absolute URI without fragment or query',
              ),
            );
        }
      }

      // ======================
      // PHASE 3: PKCE VALIDATION (MANDATORY FOR OAUTH 2.1)
      // ======================
      // Both parameters REQUIRED (RFC 7636 §4.3)
      if (!code_challenge || !code_challenge_method) {
        return reply
          .status(302)
          .redirect(
            buildErrorRedirect(
              'invalid_request',
              'PKCE required: code_challenge and code_challenge_method must be provided',
            ),
          );
      }

      // Normalize method for case-insensitive comparison (RFC 7636 §4.2)
      const normalizedMethod = code_challenge_method.trim().toLowerCase();
      if (normalizedMethod !== 's256' && normalizedMethod !== 'plain') {
        return reply
          .status(302)
          .redirect(
            buildErrorRedirect(
              'invalid_request',
              'code_challenge_method must be "S256" or "plain"',
            ),
          );
      }

      // Validate code_challenge format (RFC 7636 §4.2)
      if (code_challenge.length < 43 || code_challenge.length > 128) {
        return reply
          .status(302)
          .redirect(
            buildErrorRedirect(
              'invalid_request',
              'code_challenge must be 43-128 characters',
            ),
          );
      }

      // Strict base64url validation (no padding, RFC 4648 §5)
      if (!/^[A-Za-z0-9\-_]+$/.test(code_challenge)) {
        return reply
          .status(302)
          .redirect(
            buildErrorRedirect(
              'invalid_request',
              'code_challenge must be base64url-encoded without padding',
            ),
          );
      }

      // ======================
      // PHASE 4: CREATE AUTHORIZATION REQUEST
      // ======================
      try {
        // Generate authorization record
        const authorizationId = randomUUID();
        const expiresAt = new Date(
          Date.now() + Number(process.env.JWT_EXPIRY_SECONDS ?? 3600) * 1000,
        );

        const OAuthAuthModel = request.server.sequelize.getCollection(
          'oauth_authorizations',
        ).model;
        await OAuthAuthModel.create({
          authorization_id: authorizationId,
          client_id,
          redirect_uri,
          scope,
          state,
          resource,
          code_challenge,
          code_challenge_method: normalizedMethod, // Store normalized value
          nonce,
          status: 'pending',
          expires_at: expiresAt,
          created_at: new Date(),
        });

        // ======================
        // PHASE 5: REDIRECT TO CONSENT FLOW
        // ======================
        const authPath = process.env.AUTHORIZATION_PATH;
        if (!authPath) {
          return reply
            .status(302)
            .redirect(
              buildErrorRedirect(
                'server_error',
                'Authorization path not configured',
              ),
            );
        }

        // Safely construct internal authorization URL
        const siteUrl = (process.env.SITE_URL || '').replace(/\/+$/, '');
        const normalizedPath = authPath.startsWith('/')
          ? authPath
          : `/${authPath}`;
        const consentUrl = `${siteUrl}${normalizedPath}?authorization_id=${encodeURIComponent(authorizationId)}`;

        return reply.status(302).redirect(consentUrl);
      } catch (err) {
        return reply
          .status(302)
          .redirect(
            buildErrorRedirect('server_error', 'Authorization request failed'),
          );
      }
    },
  );

  // GET /authorizations/:authorization_id
  app.get<{Params: {authorization_id: string}}>(
    '/authorizations/:authorization_id',
    {
      preHandler: requireAuthentication,
      schema: {
        summary: 'Get OAuth authorization details',
        tags: ['oauth-server'],
        operationId: 'OAuthServerController_getAuthorization',
        description:
          'Retrieves details about a pending OAuth authorization request. Only available when OAuth server is enabled (set `OAUTH_SERVER_ENABLED=true` for self-hosted or enable in Dashboard).',
        params: {
          type: 'object',
          properties: {
            authorization_id: {type: 'string'},
          },
          required: ['authorization_id'],
        },
        response: {
          200: {$ref: 'OAuthAuthorizationResponse'},
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          404: {description: 'Authorization not found', $ref: 'ErrorResponse'},
        },
      },
    },
    async (request, reply) => {
      const {authorization_id} = request.params;
      const origin = request.headers.origin;

      if (!isRedirectURLValid(origin)) {
        return reply.status(400).send({msg: 'unauthorized request origin'});
      }

      const user = request.user;
      if (!user) {
        return reply.status(403).send({msg: 'authentication required'});
      }

      const OAuthAuthorizationModel = app.sequelize.getCollection(
        'oauth_authorizations',
      ).model;
      const oauthAuthorization = await OAuthAuthorizationModel.findOne({
        where: {authorization_id: authorization_id},
      });

      if (!oauthAuthorization) {
        return reply.status(404).send({msg: 'Authorization not found'});
      }

      if (oauthAuthorization.isExpired()) {
        if (oauthAuthorization.status !== 'pending') {
          return reply.status(400).send({
            msg: `authorization request is not pending (current status: ${oauthAuthorization.status})`,
          });
        }
        oauthAuthorization.status = 'expired';
        await oauthAuthorization.save();
        return reply.status(404).send({msg: 'Authorization not found'});
      } else if (oauthAuthorization.status !== 'pending') {
        return reply
          .status(400)
          .send({msg: 'Authorization request cannot be processed'});
      }

      if (oauthAuthorization.user_id === null) {
        oauthAuthorization.user_id = user.id;
        await oauthAuthorization.save();

        const OAuthConsentModel =
          app.sequelize.getCollection('oauth_consents').model;
        const oauthConsent = await OAuthConsentModel.findOne({
          where: {
            user_id: user.id,
            client_id: oauthAuthorization.client_id,
            revoked_at: null,
          },
        });

        let shouldAutoApprove = false;
        if (
          oauthConsent &&
          oauthConsent.coversScopes(oauthAuthorization.scope)
        ) {
          shouldAutoApprove = true;
        }

        if (shouldAutoApprove) {
          if (oauthAuthorization.isExpired()) {
            return reply
              .status(400)
              .send({msg: 'Authorization request has expired'});
          }
          if (oauthAuthorization.status !== 'pending') {
            return reply.status(400).send({
              msg: `Authorization request is not pending (current status: ${oauthAuthorization.status})`,
            });
          }

          const now = new Date();
          oauthAuthorization.status = 'approved';
          oauthAuthorization.approved_at = now;
          oauthAuthorization.authorization_code =
            randomBytes(32).toString('hex');
          await oauthAuthorization.save();

          const redirectUrl = new URL(oauthAuthorization.redirect_uri);
          redirectUrl.searchParams.set(
            'code',
            oauthAuthorization.authorization_code,
          );
          if (oauthAuthorization.state) {
            redirectUrl.searchParams.set('state', oauthAuthorization.state);
          }

          return reply.status(200).send({
            redirect_url: redirectUrl.toString(),
          });
        }
      } else {
        if (oauthAuthorization.user_id !== user.id) {
          return reply.status(404).send({msg: 'Authorization not found'});
        }
      }

      const OAuthClientModel =
        app.sequelize.getCollection('oauth_clients').model;
      const client = await OAuthClientModel.findOne({
        where: {id: oauthAuthorization.client_id},
      });

      if (!client) {
        return reply.status(400).send({msg: 'Invalid client credentials'});
      }

      const response = {
        authorization_id: oauthAuthorization.authorization_id,
        redirect_uri: oauthAuthorization.redirect_uri,
        client: {
          id: client.id,
          name: client.name,
          uri: client.uri,
          logo_uri: client.logo_uri,
        },
        user: {
          id: user.id,
          email: user.email,
        },
        scope: oauthAuthorization.scope,
      };

      return reply.status(200).send(response);
    },
  );

  // POST /authorizations/:authorization_id/consent
  app.post<{
    Params: {authorization_id: string};
    Body: OAuthAuthorizationsAuthorizationIdConsentBody;
  }>(
    '/authorizations/:authorization_id/consent',
    {
      preHandler: requireAuthentication,
      schema: {
        tags: ['oauth-server'],
        summary: 'Approve or deny OAuth authorization',
        operationId: 'OAuthServerController_postAuthorizationConsent',
        description:
          'User approves or denies authorization to the OAuth client. Only available when OAuth server is enabled (set `OAUTH_SERVER_ENABLED=true` for self-hosted or enable in Dashboard).',
        params: {
          type: 'object',
          properties: {authorization_id: {type: 'string'}},
          required: ['authorization_id'],
        },
        body: {
          type: 'object',
          $ref: 'OAuthAuthorizationsAuthorizationIdConsentBody',
        },
        response: {
          200: {
            description: 'Authorization consent processed',
            $ref: 'OAuthConsentResponse',
          },
          400: {
            $ref: 'BadRequestResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const {authorization_id} = request.params;
      const origin = request.headers.origin;

      if (!isRedirectURLValid(origin)) {
        return reply.status(400).send({msg: 'unauthorized request origin'});
      }

      const user = request.user;
      if (!user) {
        return reply.status(403).send({msg: 'authentication required'});
      }

      const OAuthAuthorizationModel = app.sequelize.getCollection(
        'oauth_authorizations',
      ).model;
      const oauthAuthorization = await OAuthAuthorizationModel.findOne({
        where: {authorization_id: authorization_id},
      });

      if (!oauthAuthorization) {
        return reply.status(404).send({msg: 'Authorization not found'});
      }

      if (oauthAuthorization.isExpired()) {
        if (oauthAuthorization.status !== 'pending') {
          return reply.status(400).send({
            msg: `authorization request is not pending (current status: ${oauthAuthorization.status})`,
          });
        }
        oauthAuthorization.status = 'expired';
        await oauthAuthorization.save();
        return reply.status(404).send({msg: 'Authorization not found'});
      } else if (oauthAuthorization.status !== 'pending') {
        return reply
          .status(400)
          .send({msg: 'Authorization request cannot be processed'});
      }

      if (oauthAuthorization.user_id !== user.id) {
        return reply.status(404).send({msg: 'Authorization not found'});
      }

      if (oauthAuthorization.status !== 'pending') {
        return reply.status(400).send({
          msg: 'authorization request is no longer pending',
        });
      }

      return reply.send();
    },
  );

  // GET /userinfo (OIDC UserInfo)
  app.get(
    '/userinfo',
    {
      preHandler: requireAuthentication,
      schema: {
        tags: ['oauth-server'],
        summary: 'Get user info',
        operationId: 'OAuthServerController_getUserInfo',
        description:
          'Retrieves user info. Only available when OAuth server is enabled (set `OAUTH_SERVER_ENABLED=true` for self-hosted or enable in Dashboard).',
        response: {
          200: {
            description: 'User info',
            $ref: 'UserInfoResponse',
          },
          400: {
            $ref: 'BadRequestResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user!;
      const session = request.session;
      const claims = request.jwtClaims!;

      // Base OIDC response (sub is mandatory)
      const userInfo: Record<string, any> = {
        sub: claims.sub,
      };

      // Non-OAuth token: return minimal info
      if (!session) {
        return reply.status(200).send(userInfo);
      }

      const scopes = (claims.scope || '').split(' ').filter(Boolean);

      const hasEmailScope = hasScope(scopes, Scope.Email);
      const hasProfileScope = hasScope(scopes, Scope.Profile);
      const hasPhoneScope = hasScope(scopes, Scope.Phone);

      /* -------- Email scope -------- */
      if (hasEmailScope) {
        if (user.email) userInfo.email = user.email;
        if (user.email_confirmed_at) userInfo.email_verified = true;
      }

      /* -------- Profile scope -------- */
      if (hasProfileScope) {
        const meta = user.user_metadata || {};

        if (meta.name) userInfo.name = meta.name;
        else if (user.email) userInfo.name = user.email;

        if (meta.picture) userInfo.picture = meta.picture;
        else if (meta.avatar_url) userInfo.picture = meta.avatar_url;

        if (meta.preferred_username)
          userInfo.preferred_username = meta.preferred_username;
        else if (meta.username) userInfo.preferred_username = meta.username;

        if (user.updated_at) {
          userInfo.updated_at = Math.floor(
            new Date(user.updated_at).getTime() / 1000,
          );
        }

        userInfo.user_metadata = meta;
      }

      /* -------- Phone scope -------- */
      if (hasPhoneScope) {
        if (user.phone) userInfo.phone = user.phone;
        if (user.phone_confirmed_at) {
          userInfo.phone_verified = true;
        }
      }

      return reply.status(200).send(userInfo);
    },
  );
};

export default oauthServerRoutes;
