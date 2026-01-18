import type {FastifyPluginAsync} from 'fastify';

const oauthClientRoutes: FastifyPluginAsync = async app => {
  // --- GET /authorize ---
  app.get<{
    Querystring: {
      provider: string;
      scopes: string;
      invite_token?: string;
      redirect_to?: string;
      code_challenge_method?: 'plain' | 's256';
    };
  }>(
    '/authorize',
    {
      schema: {
        tags: ['oauth-client'],
        operationId: 'OAuthClientController_buildOAuthAuthorizationUrl',
        summary:
          'Redirects to an external OAuth provider. Usually for use as clickable links.',
        querystring: {
          type: 'object',
          required: ['provider', 'scopes'],
          additionalProperties: false,
          properties: {
            provider: {
              type: 'string',
              pattern: '^[a-zA-Z0-9]+$',
              description: 'Name of the OAuth provider',
            },
            scopes: {
              type: 'string',
              pattern: '[^ ]+( +[^ ]+)*',
              description: 'Space separated list of OAuth scopes',
            },
            invite_token: {
              type: 'string',
              description: 'Optional invitation token for new users',
            },
            redirect_to: {
              type: 'string',
              format: 'uri',
              description: 'Optional URL to redirect after sign-in',
            },
            code_challenge_method: {
              type: 'string',
              enum: ['plain', 's256'],
              description: 'Method to encrypt PKCE code verifier',
            },
          },
        },
        response: {
          302: {$ref: 'OAuthAuthorizeRedirectResponse'},
        },
      },
    },
    async (request, reply) => {
      const {
        provider,
        scopes,
        invite_token,
        redirect_to,
        code_challenge_method,
      } = request.query;

      // Build the OAuth authorization URL
      const authUrl = await buildOAuthAuthorizationUrl({
        provider,
        scopes,
        invite_token,
        redirect_to,
        code_challenge_method,
      });

      // Send redirect
      return reply.header('Location', authUrl).code(302).send();
    },
  );

  // GET /callback
  app.get(
    '/callback',
    {
      schema: {
        summary: 'Redirects OAuth flow errors to the frontend app.',
        description:
          'When an OAuth sign-in flow fails for any reason, the error message needs to be delivered to the frontend app requesting the flow. This callback delivers the errors as `error` and `error_description` query params. Usually this request is not called directly.',
        tags: ['oauth-client'],
        operationId: 'OAuthController_getCallback',
        response: {
          302: {
            $ref: 'OAuthCallbackRedirectResponse',
          },
        },
      },
    },
    async (_request, reply) => {
      // Actual implementation should build redirect URL with error params
      return reply.status(302).redirect('/');
    },
  );

  // POST /callback
  app.post(
    '/callback',
    {
      schema: {
        summary: 'Redirects OAuth flow errors to the frontend app.',
        description:
          'When an OAuth sign-in flow fails for any reason, the error message needs to be delivered to the frontend app requesting the flow. This callback delivers the errors as `error` and `error_description` query params. Usually this request is not called directly.',
        tags: ['oauth-client'],
        operationId: 'UserController_postCallback',
        response: {
          302: {
            $ref: 'OAuthCallbackRedirectResponse',
          },
        },
      },
    },
    async (_request, reply) => {
      // Actual implementation should build redirect URL with error params
      return reply.status(302).redirect('/');
    },
  );
};

export async function buildOAuthAuthorizationUrl(params: {
  provider: string;
  scopes: string;
  invite_token?: string;
  redirect_to?: string;
  code_challenge_method?: 'plain' | 's256';
}): Promise<string> {
  return 'https://example.com/oauth/authorize';
}

export default oauthClientRoutes;
