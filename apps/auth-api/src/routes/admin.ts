import type {FastifyPluginAsync} from 'fastify';
import {
  GenerateLinkBody,
  InviteBody,
  OAuthClientsBody,
  OAuthClientsClientIdBody,
  SSOProvidersBody,
  SSOProvidersSSOProviderIdBody,
  UserBody,
} from '../openapi/index.js';
import {
  createSSOProvider,
  deleteOAuthClient,
  deleteSSOProvider,
  deleteUser,
  deleteUserFactor,
  generate_link,
  getAudit,
  getOAuthClientById,
  getOAuthClients,
  getSSOProviderById,
  getSSOProviders,
  getUserById,
  getUserFactors,
  getUsers,
  inviteUser,
  postOAuthClient,
  regenerateOAuthClientSecret,
  updateOAuthClient,
  updateSSOProvider,
  updateUser,
  updateUserFactor,
} from '../services/index.js';

const adminSSORoutes: FastifyPluginAsync = async app => {
  app.post<{Body: InviteBody}>(
    '/invite',
    {
      schema: {
        summary: 'Invite a user by email.',
        description:
          'Sends an invitation email which contains a link that allows the user to sign-in.',
        tags: ['admin'],
        operationId: 'AdminController_inviteUser',
        body: {
          type: 'object',
          $ref: 'InviteBody',
        },
        response: {
          200: {
            description: 'An invitation has been sent to the user.',
            $ref: 'UserResponse',
          },
          400: {
            $ref: 'BadRequestResponse',
          },
          422: {
            description: 'User already exists and has confirmed their address.',
            $ref: 'ErrorResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const user = await inviteUser(request.body);
      return reply.send(user);
    },
  );

  // POST /admin/generate_link
  app.post<{Body: GenerateLinkBody}>(
    'admin//generate_link',
    {
      schema: {
        summary: 'Generate an action link for a user.',
        tags: ['admin'],
        operationId: 'AdminController_generate_link',
        body: {
          type: 'object',
          $ref: 'GenerateLinkBody',
        },
        response: {
          200: {
            description: 'User profile and generated link information.',
            $ref: 'VerificationResponse',
          },
          400: {
            $ref: 'BadRequestResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            description: `HTTP Forbidden response.`,
            $ref: 'ErrorResponse',
          },
          404: {
            description: `There is no such user.`,
            $ref: 'ErrorResponse',
          },
          422: {
            description: `Has multiple meanings:
- User already exists
- Provided password does not meet minimum criteria
- Secure email change not enabled
`,
            $ref: 'ErrorResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const result = await generate_link(request.body);
      return reply.send(result);
    },
  );

  // GET /admin/audit
  app.get<{Querystring: {page?: number; per_page?: number}}>(
    '/admin/audit',
    {
      schema: {
        summary: 'Fetch audit log events.',
        tags: ['admin'],
        operationId: 'AdminController_getAudit',
        querystring: {
          type: 'object',
          properties: {
            page: {type: 'integer', minimum: 1, default: 1},
            per_page: {type: 'integer', minimum: 1, default: 50},
          },
          additionalProperties: false,
        },
        response: {
          200: {
            description: 'List of audit logs.',
            $ref: 'AuditLogResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const {page = 1, per_page = 50} = request.query;
      const logs = await getAudit(page, per_page);
      return reply.send(logs);
    },
  );

  // GET /admin/users
  app.get<{Querystring: {page?: number; per_page?: number}}>(
    '/admin/users',
    {
      schema: {
        tags: ['admin'],
        summary: 'Fetch a listing of users.',
        operationId: 'AdminController_getUsers',
        querystring: {
          type: 'object',
          properties: {
            page: {type: 'integer', minimum: 1, default: 1},
            per_page: {type: 'integer', minimum: 1, default: 50},
          },
          additionalProperties: false,
        },
        response: {
          200: {
            description: 'A page of users',
            $ref: 'UserListResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const {page = 1, per_page = 50} = request.query;
      const users = await getUsers(page, per_page);
      return reply.send(users);
    },
  );

  // GET /admin/users/:userId
  app.get<{Params: {userId: string}}>(
    '/admin/users/:userId',
    {
      schema: {
        summary: 'Fetch user account data for a user.',
        tags: ['admin'],
        operationId: 'AdminController_getUserById',
        params: {
          type: 'object',
          properties: {
            userId: {type: 'string', format: 'uuid'},
          },
          required: ['userId'],
        },
        response: {
          200: {
            description: "User's account data.",
            $ref: 'UserResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
          404: {description: 'There is no such user.', $ref: 'ErrorResponse'},
        },
      },
    },
    async (request, reply) => {
      const user = await getUserById(request.params.userId);
      return reply.send(user);
    },
  );

  // PUT /admin/users/:userId
  app.put<{Params: {userId: string}; Body: UserBody}>(
    '/admin/users/:userId',
    {
      schema: {
        summary: "Update user's account data.",
        tags: ['admin'],
        operationId: 'AdminController_updateUser',
        params: {
          type: 'object',
          properties: {
            userId: {type: 'string', format: 'uuid'},
          },
          required: ['userId'],
        },
        body: {
          type: 'object',
          $ref: 'UserBody',
        },
        response: {
          200: {
            description: "User's account data was updated.",
            $ref: 'UserResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
          404: {description: 'There is no such user.', $ref: 'ErrorResponse'},
        },
      },
    },
    async (request, reply) => {
      const user = await updateUser(request.params.userId, request.body);
      return reply.send(user);
    },
  );

  // DELETE /admin/users/:userId
  app.delete<{Params: {userId: string}}>(
    '/admin/users/:userId',
    {
      schema: {
        summary: 'Delete a user.',
        tags: ['admin'],
        operationId: 'AdminController_deleteUser',
        params: {
          type: 'object',
          properties: {
            userId: {type: 'string', format: 'uuid'},
          },
          required: ['userId'],
        },
        response: {
          200: {
            description: "User's account data.",
            $ref: 'UserResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
          404: {description: 'There is no such user.', $ref: 'ErrorResponse'},
        },
      },
    },
    async (request, reply) => {
      const user = await deleteUser(request.params.userId);
      return reply.send(user);
    },
  );

  // GET /admin/users/:userId/factors
  app.get<{Params: {userId: string}}>(
    '/admin/users/:userId/factors',
    {
      schema: {
        summary: 'List all of the MFA factors for a user.',
        tags: ['admin'],
        operationId: 'AdminController_getUserFactors',
        params: {
          type: 'object',
          properties: {
            userId: {type: 'string', format: 'uuid'},
          },
          required: ['userId'],
        },
        response: {
          200: {
            description: "User's MFA factors.",
            $ref: 'MFAFactorListResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
          404: {description: 'There is no such user.', $ref: 'ErrorResponse'},
        },
      },
    },
    async (request, reply) => {
      const factors = await getUserFactors(request.params.userId);
      return reply.send(factors);
    },
  );

  // PUT /admin/users/:userId/factors/:factorId
  app.put<{
    Params: {userId: string; factorId: string};
    Body: Record<string, unknown>;
  }>(
    '/admin/users/:userId/factors/:factorId',
    {
      schema: {
        summary: "Update a user's MFA factor.",
        tags: ['admin'],
        operationId: 'AdminController_updateUserFactor',
        params: {
          type: 'object',
          properties: {
            userId: {type: 'string', format: 'uuid'},
            factorId: {type: 'string', format: 'uuid'},
          },
          required: ['userId', 'factorId'],
        },
        body: {
          type: 'object',
          additionalProperties: true,
        },
        response: {
          200: {
            description: "User's MFA factor.",
            $ref: 'MFAFactorResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
          404: {
            description: 'There is no such user and/or factor.',
            $ref: 'ErrorResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const factor = await updateUserFactor(
        request.params.userId,
        request.params.factorId,
        request.body,
      );
      return reply.send(factor);
    },
  );

  // DELETE /admin/users/:userId/factors/:factorId
  app.delete<{Params: {userId: string; factorId: string}}>(
    '/admin/users/:userId/factors/:factorId',
    {
      schema: {
        summary: "Remove a user's MFA factor.",
        tags: ['admin'],
        operationId: 'AdminController_deleteUserFactor',
        params: {
          type: 'object',
          properties: {
            userId: {type: 'string', format: 'uuid'},
            factorId: {type: 'string', format: 'uuid'},
          },
          required: ['userId', 'factorId'],
        },
        response: {
          200: {
            description: "User's MFA factor.",
            $ref: 'MFAFactorResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
          404: {
            description: 'There is no such user and/or factor.',
            $ref: 'ErrorResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const factor = await deleteUserFactor(
        request.params.userId,
        request.params.factorId,
      );
      return reply.send(factor);
    },
  );

  // GET /admin/sso/providers
  app.get(
    '/admin/sso/providers',
    {
      schema: {
        summary: 'Fetch a list of all registered SSO providers.',
        tags: ['admin'],
        operationId: 'AdminSSOController_getSSOProviders',
        response: {
          200: {
            description: 'A list of all providers.',
            $ref: 'SSOProviderListResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const items = await getSSOProviders();
      return reply.send({items});
    },
  );

  // POST /admin/sso/providers
  app.post<{Body: SSOProvidersBody}>(
    '/admin/sso/providers',
    {
      schema: {
        summary: 'Register a new SSO provider.',
        tags: ['admin'],
        operationId: 'AdminSSOController_createSSOProvider',
        body: {
          type: 'object',
          $ref: 'SSOProvidersBody',
        },
        response: {
          200: {
            description: 'SSO provider was created.',
            $ref: 'SSOProviderResponse',
          },
          400: {
            $ref: 'BadRequestResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const provider = await createSSOProvider(request.body);
      return reply.send(provider);
    },
  );

  // GET /admin/sso/providers/:ssoProviderId
  app.get<{Params: {ssoProviderId: string}}>(
    '/admin/sso/providers/:ssoProviderId',
    {
      schema: {
        summary: 'Fetch SSO provider details.',
        tags: ['admin'],
        operationId: 'AdminSSOController_getSSOProviderById',
        response: {
          200: {
            description: 'SSO provider exists with these details.',
            $ref: 'SSOProviderResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {$ref: 'ForbiddenResponse'},
          404: {
            description: 'A provider with this UUID does not exist.',
            $ref: 'ErrorResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const provider = await getSSOProviderById(request.params.ssoProviderId);
      return reply.send(provider);
    },
  );

  // PUT /admin/sso/providers/:ssoProviderId
  app.put<{
    Params: {ssoProviderId: string};
    Body: SSOProvidersSSOProviderIdBody;
  }>(
    '/admin/sso/providers/:ssoProviderId',
    {
      schema: {
        summary: 'Update details about a SSO provider.',
        description:
          'You can only update only one of `metadata_url` or `metadata_xml` at once. The SAML Metadata represented by these updates must advertize the same Identity Provider EntityID. Do not include the `domains` or `attribute_mapping` property to keep the existing database values.',
        tags: ['admin'],
        operationId: 'AdminSSOController_updateSSOProvider',
        body: {
          type: 'object',
          $ref: 'SSOProvidersBody',
        },
        response: {
          200: {
            description: 'SSO provider details were updated.',
            $ref: 'SSOProviderResponse',
          },
          400: {
            $ref: 'BadRequestResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
          404: {
            description: 'A provider with this UUID does not exist.',
            $ref: 'ErrorResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const provider = await updateSSOProvider(
        request.params.ssoProviderId,
        request.body,
      );
      return reply.send(provider);
    },
  );

  // DELETE /admin/sso/providers/:ssoProviderId
  app.delete<{Params: {ssoProviderId: string}}>(
    '/admin/sso/providers/:ssoProviderId',
    {
      schema: {
        tags: ['admin'],
        summary: 'Remove an SSO provider.',
        operationId: 'AdminSSOController_deleteSSOProvider',
        params: {
          type: 'object',
          properties: {
            ssoProviderId: {type: 'string', format: 'uuid'},
          },
          required: ['ssoProviderId'],
        },
        response: {
          200: {
            description: 'SSO provider was removed.',
            $ref: 'SSOProviderResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
          404: {
            description: 'A provider with this UUID does not exist.',
            $ref: 'ErrorResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const provider = await deleteSSOProvider(request.params.ssoProviderId);
      return reply.send(provider);
    },
  );

  // GET /admin/oauth/clients
  app.get<{Querystring: {page?: number; per_page?: number}}>(
    '/admin/oauth/clients',
    {
      schema: {
        summary: 'List OAuth clients (admin)',
        description:
          'Retrieves a list of all registered OAuth clients. Only available when OAuth server is enabled.',
        tags: ['admin', 'oauth-server'],
        operationId: 'AdminSSOController_getOAuthClients',
        querystring: {
          type: 'object',
          properties: {
            page: {type: 'integer', minimum: 1, default: 1},
            per_page: {type: 'integer', minimum: 1, default: 50},
          },
          additionalProperties: false,
        },
        response: {
          200: {
            description: 'List of OAuth clients',
            $ref: 'OAuthClientListResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const {page = 1, per_page = 50} = request.query;
      const clients = await getOAuthClients(page, per_page);
      return reply.send(clients);
    },
  );

  // POST /admin/oauth/clients
  app.post<{Body: OAuthClientsBody}>(
    '/admin/oauth/clients',
    {
      schema: {
        summary: 'Register OAuth client (admin)',
        description:
          'Manually register a new OAuth client (admin endpoint). Only available when OAuth server is enabled.',
        tags: ['admin', 'oauth-server'],
        operationId: 'AdminSSOController_postoauthclients',
        body: {
          type: 'object',
          $ref: 'OAuthClientsBody',
        },
        response: {
          201: {
            description: 'OAuth client created',
            $ref: 'OAuthClientResponse',
          },
          400: {
            $ref: 'BadRequestResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const client = await postOAuthClient(request.body);
      return reply.send(client);
    },
  );

  // GET /admin/oauth/clients/:client_id
  app.get<{Params: {client_id: string}}>(
    '/admin/oauth/clients/:client_id',
    {
      schema: {
        summary: 'Get OAuth client details (admin)',
        description:
          'Retrieves details of a specific OAuth client. Only available when OAuth server is enabled.',
        tags: ['admin', 'oauth-server'],
        operationId: 'AdminSSOController_getOAuthClientById',
        params: {
          type: 'object',
          properties: {
            client_id: {type: 'string'},
          },
          required: ['client_id'],
        },
        response: {
          200: {
            description: 'OAuth client details',
            $ref: 'OAuthClientResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          404: {
            description: `OAuth client not found`,
            $ref: 'ErrorResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const client = await getOAuthClientById(request.params.client_id);
      return reply.send(client);
    },
  );

  // PUT /admin/oauth/clients/:client_id
  app.put<{Params: {client_id: string}; Body: OAuthClientsClientIdBody}>(
    '/admin/oauth/clients/:client_id',
    {
      schema: {
        summary: 'Update OAuth client (admin)',
        description: `Updates an existing OAuth client registration. Only the provided fields will be updated.
        Only available when OAuth server is enabled.`,
        tags: ['admin', 'oauth-server'],
        operationId: 'AdminSSOController_putOAuthClientById',
        params: {
          type: 'object',
          properties: {
            client_id: {type: 'string'},
          },
          required: ['client_id'],
        },
        body: {
          type: 'object',
          $ref: 'OAuthClientsClientIdBody',
        },
        response: {
          200: {
            description: 'OAuth client updated successfully',
            $ref: 'OAuthClientResponse',
          },
          400: {
            description:
              'Bad request - validation failed or no fields provided for update',
            $ref: 'ErrorResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
          404: {description: 'OAuth client not found', $ref: 'ErrorResponse'},
        },
      },
    },
    async (request, reply) => {
      const client = await updateOAuthClient(
        request.params.client_id,
        request.body,
      );
      return reply.send(client);
    },
  );

  // DELETE /admin/oauth/clients/:client_id
  app.delete<{Params: {client_id: string}}>(
    '/admin/oauth/clients/:client_id',
    {
      schema: {
        summary: 'Delete OAuth client (admin)',
        description: `Removes an OAuth client registration. Only available when OAuth server is enabled.`,
        tags: ['admin', 'oauth-server'],
        operationId: 'AdminSSOController_deleteOAuthClientById',
        params: {
          type: 'object',
          properties: {
            client_id: {type: 'string'},
          },
          required: ['client_id'],
        },
        response: {
          204: {
            description: 'OAuth client deleted',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
          404: {description: 'OAuth client not found', $ref: 'ErrorResponse'},
        },
      },
    },
    async (request, reply) => {
      await deleteOAuthClient(request.params.client_id);
      return reply.status(204).send();
    },
  );

  // POST /admin/oauth/clients/:client_id/regenerate_secret
  app.post<{Params: {client_id: string}}>(
    '/admin/oauth/clients/:client_id/regenerate_secret',
    {
      schema: {
        summary: 'Regenerate OAuth client secret (admin)',
        description: `Regenerates the client secret for a confidential OAuth client. Only available when OAuth server is enabled.
        This endpoint can only be used for confidential clients, not public clients.`,
        tags: ['admin', 'oauth-server'],
        operationId: 'AdminSSOController_regenerateOAuthClientSecret',
        params: {
          type: 'object',
          properties: {
            client_id: {type: 'string'},
          },
          required: ['client_id'],
        },
        response: {
          200: {
            description: 'OAuth client secret regenerated successfully',
            $ref: 'OAuthClientResponse',
          },
          400: {
            description:
              'Bad request - cannot regenerate secret for public client',
            $ref: 'ErrorResponse',
          },
          401: {
            $ref: 'UnAuthorizedResponse',
          },
          403: {
            $ref: 'ForbiddenResponse',
          },
          404: {description: 'OAuth client not found', $ref: 'ErrorResponse'},
        },
      },
    },
    async (request, reply) => {
      const client = await regenerateOAuthClientSecret(
        request.params.client_id,
      );
      return reply.send(client);
    },
  );
};

export default adminSSORoutes;
