import type {FastifyPluginAsync} from 'fastify';
import {
  buildOAuthLinkIdentityUrl,
  challengeFactor,
  createFactor,
  deleteFactor,
  getCurrentUser,
  listUserOAuthGrants,
  revokeOAuthGrant,
  sendReauthenticationOTP,
  unlinkUserIdentity,
  updateCurrentUser,
  verifyFactor,
} from '../services/user.js';
import {
  FactorsBody,
  FactorsIdChallengeBody,
  FactorsIdVerifyBody,
  IdentityIdParams,
  LinkIdentityQuery,
  RevokeGrantQuery,
  UserBody,
} from '../openapi/index.js';

const userRoutes: FastifyPluginAsync = async app => {
  // GET /user
  app.get(
    '/user',
    {
      schema: {
        tags: ['user'],
        operationId: 'UserController_getCurrentUser',
        summary: 'Fetch the latest user account information.',
        response: {
          200: {
            description: "User's account information.",
            $ref: 'UserResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const user = await getCurrentUser();
      return reply.send(user);
    },
  );

  // PUT /user
  app.put<{Body: UserBody}>(
    '/user',
    {
      schema: {
        tags: ['user'],
        operationId: 'UserController_updateCurrentUser',
        summary: 'Update certain properties of the current user account.',
        body: {
          type: 'object',
          $ref: 'UserBody',
        },
        response: {
          200: {
            description: "User's updated account information.",
            $ref: 'UserResponse',
          },
          400: {$ref: 'BadRequestResponse'},
          429: {$ref: 'RateLimitResponse'},
        },
      },
    },
    async (request, reply) => {
      const updatedUser = await updateCurrentUser(request.body);
      return reply.send(updatedUser);
    },
  );

  app.get<{Querystring: LinkIdentityQuery}>(
    '/user/identities/authorize',
    {
      schema: {
        tags: ['user'],
        operationId: 'UserController_buildOAuthLinkIdentityUrl',
        summary:
          'Links an OAuth identity to an existing user. Redirects to an external OAuth provider.',
        querystring: {
          type: 'object',
          $ref: 'LinkIdentityQuery',
        },
        response: {
          302: {
            $ref: 'OAuthAuthorizeRedirectResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const {provider, scopes, redirect_to, code_challenge_method} =
        request.query;

      const authUrl = await buildOAuthLinkIdentityUrl({
        provider,
        scopes,
        redirect_to,
        code_challenge_method,
      });

      return reply.status(302).header('Location', authUrl).send();
    },
  );

  app.delete<{Params: IdentityIdParams}>(
    '/user/identities/:identityId',
    {
      schema: {
        tags: ['user'],
        summary: 'Unlinks an identity from the current user.',
        operationId: 'UserController_unlinkUserIdentity',
        params: {
          type: 'object',
          $ref: 'IdentityIdParams',
        },
        response: {
          200: {
            description: "User's account data after unlinking the identity.",
            $ref: 'UserResponse',
          },
          401: {
            description: 'The user is not authenticated.',
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            description: 'Forbidden error',
            $ref: 'ForbiddenResponse',
          },
          404: {
            description: 'Not found error',
            $ref: 'ErrorResponse',
          },
          422: {
            description: 'Unprocessable entity',
            $ref: 'ErrorResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const {identityId} = request.params;

      try {
        await unlinkUserIdentity(identityId);

        // Return updated user info (you can replace with real updated data)
        return reply.status(200).send({}); // or send updated user object
      } catch (err: any) {
        // Map errors to proper HTTP status codes
        switch (err.code) {
          case 'single_identity_not_deletable':
          case 'identity_already_exists':
          case 'identity_not_found':
          case 'email_conflict_identity_not_deletable':
            return reply.status(422).send({error_code: err.code});
          case 'manual_linking_disabled':
          case 'validation_failed':
            return reply.status(404).send({error_code: err.code});
          case 'no_authorization':
            return reply.status(401).send({error_code: err.code});
          case 'bad_jwt':
          case 'unexpected_audience':
            return reply.status(403).send({error_code: err.code});
          default:
            return reply.status(500).send({error_code: 'server_error'});
        }
      }
    },
  );

  app.get(
    '/user/oauth/grants',
    {
      schema: {
        tags: ['user', 'oauth-server'],
        operationId: 'UserController_listUserOAuthGrants',
        summary: 'List OAuth grants',
        response: {
          200: {
            description: "List of user's OAuth grants",
            $ref: 'OAuthGrantListResponse',
          },
          401: {$ref: 'UnAuthorizedResponse'},
          403: {$ref: 'ForbiddenResponse'},
        },
      },
    },
    async (request, reply) => {
      const grants = await listUserOAuthGrants(request);
      return reply.send(grants);
    },
  );

  // DELETE /user/oauth/grants?client_id=...
  app.delete<{Querystring: RevokeGrantQuery}>(
    '/user/oauth/grants',
    {
      schema: {
        tags: ['user', 'oauth-server'],
        summary: 'Revoke OAuth grant',
        operationId: 'UserController_revokeOAuthGrant',
        querystring: {
          type: 'object',
          $ref: 'RevokeGrantQuery',
        },
        response: {
          204: {
            description: 'Grant successfully revoked',
            type: 'null',
          },
          400: {
            description: 'Missing or invalid client_id parameter',
            $ref: 'ErrorResponse',
          },
          401: {$ref: 'UnAuthorizedResponse'},
          403: {$ref: 'ForbiddenResponse'},
          404: {
            description: 'No active grant found for this client',
            $ref: 'ErrorResponse',
          },
        },
      },
    },
    async (request, reply) => {
      try {
        await revokeOAuthGrant(request);
        return reply.status(204).send();
      } catch (err: any) {
        if (err.code === 'oauth_consent_not_found') {
          return reply.status(404).send({
            error_code: err.code,
            msg: 'No active grant found for this client',
          });
        }
        return reply.status(500).send({error_code: 'server_error'});
      }
    },
  );

  app.post(
    '/reauthenticate',
    {
      schema: {
        tags: ['user'],
        summary:
          'Reauthenticates the possession of an email or phone number for password change',
        operationId: 'UserController_sendReauthenticationOTP',
        description:
          "For a password to be changed, the user's email or phone must be confirmed. Sends a confirmation email or SMS with a nonce to use in PUT /user.",
        response: {
          200: {
            description:
              "A One-Time Password was sent to the user's email or phone.",
            type: 'object',
          },
          400: {$ref: 'BadRequestResponse'},
          429: {$ref: 'RateLimitResponse'},
        },
      },
    },
    async (request, reply) => {
      const result = await sendReauthenticationOTP(request);
      return reply.status(200).send(result);
    },
  );

  // POST /factors
  app.post<{Body: FactorsBody}>(
    '/factors',
    {
      schema: {
        tags: ['user'],
        summary: 'Begin enrolling a new factor for MFA.',
        operationId: 'UserController_createFactor',
        body: {
          type: 'object',
          $ref: 'FactorsBody',
        },
        response: {
          200: {
            description:
              'A new factor was created in the unverified state. Call `POST /factors/{factorId}/verify` to verify it.',
            $ref: 'FactorResponse',
          },
          400: {
            $ref: 'BadRequestResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const factor = await createFactor(request.body);
      return reply.send(factor);
    },
  );

  // POST /factors/:factorId/challenge
  app.post<{Params: {factorId: string}; Body: FactorsIdChallengeBody}>(
    '/factors/:factorId/challenge',
    {
      schema: {
        tags: ['user'],
        summary: 'Create a new challenge for a MFA factor.',
        operationId: 'UserController_challengeFactor',
        params: {
          type: 'object',
          properties: {
            factorId: {type: 'string', format: 'uuid'},
          },
          required: ['factorId'],
        },
        body: {
          $ref: 'FactorsIdChallengeBody',
        },
        response: {
          200: {
            description:
              'A new challenge was generated for the factor. Use POST /factors/{factorId}/verify to verify the challenge.',
            oneOf: [
              {$ref: 'TOTPPhoneChallengeResponse'},
              {$ref: 'WebAuthnChallengeResponse'},
            ],
          },
          400: {
            $ref: 'BadRequestResponse',
          },
          429: {
            $ref: 'RateLimitResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const challenge = await challengeFactor(
        request.params.factorId,
        request.body,
      );

      return reply.send(challenge);
    },
  );

  // POST /:factorId/verify
  app.post<{Params: {factorId: string}; Body: FactorsIdVerifyBody}>(
    '/factor/:factorId/verify',
    {
      schema: {
        tags: ['user'],
        summary: 'Verify a challenge on a factor.',
        operationId: 'UserController_verifyFactor',
        params: {
          type: 'object',
          properties: {
            factorId: {type: 'string', format: 'uuid'},
          },
          required: ['factorId'],
        },
        body: {
          type: 'object',
          $ref: 'FactorsIdVerifyBody',
        },
        response: {
          200: {
            description:
              'This challenge has been verified. Client libraries should replace their stored access and refresh tokens with the ones provided in this response. These new credentials have an increased Authenticator Assurance Level (AAL).',
            $ref: 'AccessTokenResponse',
          },
          400: {
            description:
              'HTTP Bad Request response. Can occur if the passed in JSON cannot be unmarshalled properly or when CAPTCHA verification was not successful.',
            $ref: 'ErrorResponse',
          },
          429: {
            description:
              'HTTP Too Many Requests response, when a rate limiter has been breached.',
            type: 'object',
            properties: {
              code: {type: 'integer'},
              msg: {type: 'string'},
            },
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const token = await verifyFactor(request.params.factorId, request.body);
      return reply.send(token);
    },
  );

  // DELETE /factor/:factorId
  app.delete<{Params: {factorId: string}}>(
    '/factor/:factorId',
    {
      schema: {
        tags: ['user'],
        summary: 'Remove a MFA factor from a user.',
        operationId: 'UserController_deleteFactor',
        params: {
          type: 'object',
          properties: {
            factorId: {type: 'string', format: 'uuid'},
          },
          required: ['factorId'],
        },
        response: {
          200: {
            description:
              "This MFA factor is removed (unenrolled) and cannot be used for increasing the AAL level of user's sessions. Client libraries should use the `POST /token?grant_type=refresh_token` endpoint to get a new access and refresh token with a decreased AAL.",
            $ref: 'FactorDeleteResponse',
          },
          400: {
            description:
              'HTTP Bad Request response. Can occur if the passed in JSON cannot be unmarshalled properly or when CAPTCHA verification was not successful.',
            $ref: 'ErrorResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const factor = await deleteFactor(request.params.factorId);
      return reply.send(factor);
    },
  );
};

export default userRoutes;
