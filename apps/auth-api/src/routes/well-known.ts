import type {FastifyPluginAsync} from 'fastify';
const wellKnownRoutes: FastifyPluginAsync = async app => {
  app.get(
    '/.well-known/jwks.json',
    {
      schema: {
        summary: 'Get JWKs',
        description: 'Returns the public keys used to verify JWTs.',
        tags: ['well-known'],
        operationId: 'SettingsController_getJwts',
        response: {
          200: {
            type: 'object',
            required: ['keys'],
            properties: {
              keys: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: true, // allow kty, kid, alg, crv, x, y, n, e, etc.
                },
              },
            },
            additionalProperties: false,
          },
        },
      },
    },
    async (_request, reply) => {
      const keys: any[] = [];

      for (const {publicKey} of Object.values(app.jwtConfig.keys)) {
        if (!publicKey || publicKey.kty === 'oct') continue;

        keys.push(publicKey);
      }

      reply.header('Cache-Control', 'public, max-age=600').send({keys});
    },
  );

  app.get(
    '/.well-known/openid-configuration',
    {
      schema: {
        summary: 'Get OpenID Configuration',
        description: 'Get OpenID Configuration.',
        tags: ['well-known'],
        operationId: 'SettingsController_getOpenIdConfiguration',
        response: {
          200: {
            type: 'object',
            properties: {
              issuer: {type: 'string'},
              authorization_endpoint: {type: 'string'},
              token_endpoint: {type: 'string'},
              jwks_uri: {type: 'string'},
              userinfo_endpoint: {type: 'string'},
              registration_endpoint: {type: 'string'},
              scopes_supported: {type: 'array', items: {type: 'string'}},
              response_types_supported: {
                type: 'array',
                items: {type: 'string'},
              },
              response_modes_supported: {
                type: 'array',
                items: {type: 'string'},
              },
              grant_types_supported: {type: 'array', items: {type: 'string'}},
              subject_types_supported: {type: 'array', items: {type: 'string'}},
              id_token_signing_alg_values_supported: {
                type: 'array',
                items: {type: 'string'},
              },
              token_endpoint_auth_methods_supported: {
                type: 'array',
                items: {type: 'string'},
              },
              code_challenge_methods_supported: {
                type: 'array',
                items: {type: 'string'},
              },
              claims_supported: {type: 'array', items: {type: 'string'}},
            },
          },
        },
      },
    },
    async (_request, reply) => {
      let issuer = app.jwtConfig.issuer;
      // Remove trailing slashes
      issuer = issuer.replace(/\/+$/, '');

      const response: Record<string, any> = {
        issuer: app.jwtConfig.issuer,
        authorization_endpoint: issuer + '/oauth/authorize',
        token_endpoint: issuer + '/oauth/token',
        jwks_uri: issuer + '/.well-known/jwks.json',
        userinfo_endpoint: issuer + '/oauth/userinfo',

        // OAuth 2.1 / OIDC Supported Features
        response_types_supported: ['code'],
        response_modes_supported: ['query'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256', 'HS256', 'ES256'], // TODO: derive from signing keys
        token_endpoint_auth_methods_supported: [
          'client_secret_basic',
          'client_secret_post',
          'none',
        ],
        code_challenge_methods_supported: ['S256', 'plain'],
        scopes_supported: ['openid', 'email', 'profile', 'phone'],
        claims_supported: [
          'sub',
          'aud',
          'iss',
          'exp',
          'iat',
          'auth_time',
          'nonce',
          'email',
          'email_verified',
          'phone_number',
          'phone_number_verified',
          'name',
          'picture',
          'preferred_username',
          'updated_at',
        ],
      };

      if (
        process.env.OAUTH_SERVER_ENABLED === 'true' &&
        process.env.ALLOW_DYNAMIC_REGISTRATION === 'true'
      ) {
        response.registration_endpoint = issuer + '/oauth/clients/register';
      }

      reply.header('Cache-Control', 'public, max-age=600');
      return reply.status(200).send(response);
    },
  );
};

export default wellKnownRoutes;
