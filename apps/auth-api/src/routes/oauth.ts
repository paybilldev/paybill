import type {FastifyPluginAsync, FastifyRequest} from 'fastify';
import {
  OAuthClientsBody,
  OAuthAuthorizationsAuthorizationIdConsentBody,
  OAuthTokenBody,
} from '../openapi/index.js';
import {
  buildAuthorizationRedirectUrl,
  findOAuthClientByID,
  getOAuthAuthorization,
  postOAuthConsent,
  registerOAuthClient,
} from '../services/oauth.js';
import {createHash, timingSafeEqual} from 'crypto';
import {OAuthTokenBodySchema} from '../openapi/schemas/oauth-server.schema.js';

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
      // ---------------------
      // 1️⃣ Populate client credentials from Authorization header
      // ---------------------
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Basic ')) {
        const encoded = authHeader.slice(6);
        const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
        const [id, secret] = decoded.split(':');

        if (!id || !secret) {
          return reply
            .status(400)
            .send({code: 400, msg: 'Invalid basic auth format'});
        }

        request.body.client_id ||= id;
        request.body.client_secret ||= secret;
      }

      // ---------------------
      // 2️⃣ Revalidate body after populating header credentials
      // ---------------------
      let body: OAuthTokenBody;
      try {
        body = OAuthTokenBodySchema.parse(request.body);
      } catch (err: any) {
        return reply
          .status(400)
          .send({code: 400, msg: err.errors.join(', ')});
      }

      // ---------------------
      // 3️⃣ Fetch client
      // ---------------------
      const client = await findOAuthClientByID(body.client_id!);
      if (!client) {
        return reply
          .status(400)
          .send({code: 400, msg: 'Invalid client credentials'});
      }

      // ---------------------
      // 4️⃣ Validate client secret
      // ---------------------
      if (client.isPublic()) {
        if (body.client_secret) {
          return reply.status(400).send({
            code: 400,
            msg: 'Public clients must not provide client_secret',
          });
        }
      } else {
        if (!body.client_secret) {
          return reply.status(400).send({
            code: 400,
            msg: 'Confidential clients must provide client_secret',
          });
        }

        try {
          const calc = createHash('sha256').update(body.client_secret).digest();
          const stored = Buffer.from(client.clientSecretHash, 'base64url');
          if (!timingSafeEqual(calc, stored)) {
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
      switch (body.grant_type) {
        case 'authorization_code':
          return handleAuthorizationCodeGrant(request, reply, body, client);

        case 'refresh_token':
          return handleRefreshTokenGrant(request, reply, body, client);

        default:
          return reply.status(400).send({
            code: 400,
            msg: `Unsupported grant type: ${body.grant_type}`,
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
