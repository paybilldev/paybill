import type {FastifyPluginAsync, FastifyRequest} from 'fastify';
import {
  OAuthClientsBody,
  OAuthAuthorizationsAuthorizationIdConsentBody,
  OAuthTokenBody,
} from '../openapi/index.js';
import {
  AccessTokenClaims,
  buildAuthorizationRedirectUrl,
  decryptKey,
  encryptKey,
  generateHmacKey,
  generateRefreshToken,
  getOAuthAuthorization,
  GrantParams,
  hasScope,
  IDTokenClaims,
  parseScopeString,
  postOAuthConsent,
  registerOAuthClient,
  Scope,
  SignJWT,
} from '../services/oauth.js';
import {createHash, timingSafeEqual, createHmac} from 'crypto';
import {v4 as uuidv4} from 'uuid';
import {AuditAction} from '../model/AuditLogEntryModel.js';

const oauthServerRoutes: FastifyPluginAsync = async app => {
  // POST /clients/register
  app.post<{Body: OAuthClientsBody}>(
    '/clients/register',
    {
      schema: {
        summary: 'Register a new OAuth client dynamically (public endpoint).',
        tags: ['oauth-server'],
        operationId: 'OAuthServerController_registerClient',
        description:
          'Allows applications to register as OAuth clients with this server dynamically. This follows the OAuth 2.0 Dynamic Client Registration Protocol. Only available when OAuth server is enabled and dynamic registration is allowed (set `OAUTH_SERVER_ENABLED=true` and `OAUTH_SERVER_ALLOW_DYNAMIC_REGISTRATION=true` for self-hosted or enable both settings in Dashboard)',
        body: {type: 'object', $ref: 'OAuthClientsBody'},
        response: {
          201: {
            description: 'OAuth client registered successfully',
            $ref: 'OAuthClientResponse',
          },
          400: {$ref: 'BadRequestResponse'},
          429: {
            $ref: 'RateLimitResponse',
          },
        },
      },
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '5 minutes',
          keyGenerator: (request: FastifyRequest) => request.ip,
          errorResponseBuilder: () => ({
            code: 429,
            msg: 'Too many requests',
          }),
        },
      },
    },
    async (request, reply) => {
      const client = await registerOAuthClient(request.body);
      return reply.send(client);
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
          return reply
            .status(400)
            .send({code: 400, msg: 'Invalid basic auth encoding'});
        }
        const [id, secret] = decodedAuth.split(':');
        if (!id || !secret) {
          return reply
            .status(400)
            .send({code: 400, msg: 'Invalid basic auth format'});
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
        return reply
          .status(400)
          .send({code: 400, msg: 'client_id is required'});
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(request.body.client_id)) {
        return reply
          .status(400)
          .send({code: 400, msg: 'client_id must match format "uuid"'});
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
        return reply
          .status(400)
          .send({code: 400, msg: 'Invalid client credentials'});
      }

      if (request.body.auth_method !== client.token_endpoint_auth_method) {
        return reply.status(400).send({
          code: 400,
          msg: `client is registered for '${client.token_endpoint_auth_method}' but '${request.body.auth_method}' was used`,
        });
      }

      // ---------------------
      // 4️⃣ Validate client secret
      // ---------------------
      if (client.isPublic()) {
        if (request.body.client_secret != null) {
          return reply.status(400).send({
            code: 400,
            msg: 'public clients must not provide client_secret',
          });
        }
      } else {
        if (!request.body.client_secret) {
          return reply.status(400).send({
            code: 400,
            msg: 'Confidential clients must provide client_secret',
          });
        }

        try {
          const hash = createHash('sha256')
            .update(request.body.client_secret)
            .digest();
          const stored = Buffer.from(client.client_secret_hash, 'base64url');
          if (hash.length !== stored.length || !timingSafeEqual(hash, stored)) {
            return reply
              .status(400)
              .send({code: 400, msg: 'Invalid client credentials'});
          }
        } catch {
          return reply
            .status(400)
            .send({code: 400, msg: 'Invalid client credentials'});
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
              code: 400,
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
              .send({code: 400, msg: 'OAuth authorization not found'});
          }

          if (oauthAuthorization.isExpired()) {
            return reply
              .status(400)
              .send({code: 400, msg: 'Authorization code has expired'});
          }

          if (oauthAuthorization.client_id !== client.id) {
            return reply.status(400).send({
              code: 400,
              msg: 'Authorization code was not issued for this client',
            });
          }

          if (
            request.body.resource &&
            request.body.resource !== oauthAuthorization.resource
          ) {
            return reply.status(400).send({
              code: 400,
              msg: 'Authorization code resource does not match the resource parameter',
            });
          }

          if (
            request.body.redirect_uri &&
            request.body.redirect_uri !== oauthAuthorization.redirect_uri
          ) {
            return reply
              .status(400)
              .send({code: 400, msg: 'Invalid redirect_uri'});
          }

          if (!oauthAuthorization.verifyPKCE(request.body.code_verifier)) {
            return reply
              .status(400)
              .send({code: 400, msg: 'PKCE verification failed'});
          }

          const authCodeUser = await UserModel.findOne({
            where: {id: oauthAuthorization.user_id},
          });

          if (!authCodeUser) {
            return reply
              .status(400)
              .send({code: 400, msg: 'User not found for authorization code'});
          }

          if (authCodeUser.IsBanned()) {
            return reply.status(400).send({code: 400, msg: 'User is banned'});
          }

          // --- session creation, token generation, audit log ---
          const grantParams = new GrantParams();
          grantParams.fillGrantParams(request);
          grantParams.oauth_client_id = client.id;
          grantParams.scopes = oauthAuthorization.scope;

          const AuditLogEntryModel =
            app.sequelize.getCollection('audit_log_entries').model;
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
                authCodeUser.raw_user_meta_data?.name ??
                authCodeUser.email ??
                undefined;
              idClaims.picture =
                authCodeUser.raw_user_meta_data?.picture ??
                authCodeUser.raw_user_meta_data?.avatar_url ??
                undefined;
              idClaims.preferred_username =
                authCodeUser.raw_user_meta_data?.preferred_username ??
                authCodeUser.raw_user_meta_data?.username ??
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
                code: 400,
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
              app_metadata: authCodeUser.raw_app_meta_data,
              user_metadata: authCodeUser.raw_user_meta_data,
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
              code: 400,
              msg: 'refresh_token is required for refresh_token grant',
            });
          }

          let decodedToken: Buffer;
          try {
            decodedToken = Buffer.from(request.body.refresh_token, 'base64url');
          } catch {
            return reply
              .status(400)
              .send({code: 400, msg: 'Refresh token is not valid'});
          }

          // Validation
          if (decodedToken.length !== 45) {
            // 1 + 16 + 8 + 16 + 4
            return reply
              .status(400)
              .send({code: 400, msg: 'Refresh token length invalid'});
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
              .send({code: 400, msg: 'Invalid refresh token checksum'});
          }

          const sessionIdHex = Buffer.from(sessionIdBytes).toString('hex');
          const sessionIdFormatted = `${sessionIdHex.slice(0, 8)}-${sessionIdHex.slice(8, 12)}-${sessionIdHex.slice(12, 16)}-${sessionIdHex.slice(16, 20)}-${sessionIdHex.slice(20)}`;

          const session = await SessionModel.findOne({
            where: {id: sessionIdFormatted},
            include: [{model: UserModel, as: 'user'}],
          });

          if (!session || !session.user) {
            return reply
              .status(400)
              .send({code: 400, msg: 'Invalid refresh token'});
          }

          const refreshUser = session.user;
          if (refreshUser.IsBanned()) {
            return reply.status(400).send({code: 400, msg: 'User is banned'});
          }

          let hmacKey: Buffer;
          try {
            hmacKey = await decryptKey(session.refresh_token_hmac_key);
          } catch {
            return reply
              .status(400)
              .send({code: 400, msg: 'Invalid refresh token'});
          }

          const expectedSignature = createHmac('sha256', hmacKey)
            .update(decodedToken.subarray(0, 25))
            .digest()
            .slice(0, 16);

          if (!timingSafeEqual(signature, expectedSignature)) {
            return reply
              .status(400)
              .send({code: 400, msg: 'Invalid refresh token signature'});
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
              app_metadata: refreshUser.raw_app_meta_data,
              user_metadata: refreshUser.raw_user_meta_data,
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
            code: 400,
            msg: `Unsupported grant type: ${request.body.grant_type}`,
          });
      }
    },
  );

  // GET /authorize
  app.get<{
    Querystring: {
      response_type: 'code';
      client_id: string;
      redirect_uri: string;
      scope?: string;
      state?: string;
      code_challenge: string;
      code_challenge_method: 'S256';
    };
  }>(
    '/authorize',
    {
      schema: {
        summary: 'OAuth 2.1 Authorization endpoint',
        tags: ['oauth-server'],
        operationId: 'OAuthServerController_authorize',
        description:
          'Initiates the OAuth authorization code flow. Redirects users to login and authorize the requesting application. Only available when OAuth server is enabled (set `OAUTH_SERVER_ENABLED=true` for self-hosted or enable in Dashboard).',
        querystring: {
          type: 'object',
          properties: {
            response_type: {type: 'string', enum: ['code']},
            client_id: {type: 'string'},
            redirect_uri: {type: 'string', format: 'url'},
            scope: {type: 'string'},
            state: {type: 'string'},
            code_challenge: {type: 'string'},
            code_challenge_method: {type: 'string', enum: ['S256']},
          },
          required: [
            'response_type',
            'client_id',
            'redirect_uri',
            'code_challenge',
            'code_challenge_method',
          ],
        },
        response: {
          302: {
            $ref: 'OAuthRedirectToLoginResponse',
          },
          400: {$ref: 'BadRequestResponse'},
        },
      },
    },
    async (request, reply) => {
      const redirectUrl = await buildAuthorizationRedirectUrl(request.query);
      return reply.status(302).redirect(redirectUrl);
    },
  );

  // GET /authorizations/:authorization_id
  app.get<{Params: {authorization_id: string}}>(
    '/authorizations/:authorization_id',
    {
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
      const authorization = await getOAuthAuthorization(
        request.params.authorization_id,
      );
      return reply.send(authorization);
    },
  );

  // POST /authorizations/:authorization_id/consent
  app.post<{
    Params: {authorization_id: string};
    Body: OAuthAuthorizationsAuthorizationIdConsentBody;
  }>(
    '/authorizations/:authorization_id/consent',
    {
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
      const consentResult = await postOAuthConsent(
        request.params.authorization_id,
        request.body,
      );
      return reply.send(consentResult);
    },
  );
};

export default oauthServerRoutes;
