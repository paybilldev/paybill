import {z} from 'zod';
import {zodToJsonSchema} from '../utils/zod-to-json-schema.js';

export const OAuthTokenBodySchema = z
  .object({
    grant_type: z
      .enum(['authorization_code', 'refresh_token'])
      .describe('The grant type being used'),

    code: z
      .string()
      .optional()
      .describe('Authorization code (required for authorization_code grant)'),

    redirect_uri: z
      .string()
      .url()
      .optional()
      .describe('Redirect URI (required for authorization_code grant)'),

    code_verifier: z
      .string()
      .optional()
      .describe('PKCE code verifier (required for authorization_code grant)'),

    refresh_token: z
      .string()
      .optional()
      .describe('Refresh token (required for refresh_token grant)'),

    client_id: z.string().uuid().optional().describe('OAuth client identifier'),

    client_secret: z
      .string()
      .optional()
      .describe('OAuth client secret (for confidential clients)'),
  })
  .passthrough();

export type OAuthTokenBody = z.infer<typeof OAuthTokenBodySchema>;

export const OAuthTokenBodyJsonSchema = zodToJsonSchema(OAuthTokenBodySchema, {
  name: 'OAuthTokenBody',
});

const OAuthClientSchema = z
  .object({
    client_id: z.string(),
    client_name: z.string(),
    client_secret: z.string(),
    client_type: z.enum(['public', 'confidential']),
    token_endpoint_auth_method: z.enum([
      'none',
      'client_secret_basic',
      'client_secret_post',
    ]),
    registration_type: z.enum(['dynamic', 'manual']),
    client_uri: z.string().url(),
    logo_uri: z.string().url(),
    redirect_uris: z.array(z.string().url()),
    grant_types: z.array(z.enum(['authorization_code', 'refresh_token'])),
    response_types: z.array(z.literal('code')),
    scope: z.string(),
    created_at: z.string().datetime({offset: true}),
    updated_at: z.string().datetime({offset: true}),
  })
  .partial()
  .passthrough();

export type OAuthClientResponse = z.infer<typeof OAuthClientSchema>;

export const OAuthClientResponseJsonSchema = zodToJsonSchema(
  OAuthClientSchema,
  {
    name: 'OAuthClientResponse',
  },
);

const OAuthClientListSchema = z
  .object({clients: z.array(OAuthClientSchema)})
  .partial()
  .passthrough();

export type OAuthClientListResponse = z.infer<typeof OAuthClientListSchema>;

export const OAuthClientListResponseJsonSchema = zodToJsonSchema(
  OAuthClientListSchema,
  {
    name: 'OAuthClientListResponse',
  },
);

const OAuthClientsBodySchema = z
  .object({
    client_name: z
      .string()
      .describe('Human-readable name of the client application'),
    client_uri: z
      .string()
      .url()
      .optional()
      .describe("URL of the client application's homepage"),
    logo_uri: z
      .string()
      .url()
      .optional()
      .describe("URL of the client application's logo"),
    redirect_uris: z
      .array(z.string().url())
      .describe('Array of redirect URIs used by the client (maximum 10)'),
    client_type: z
      .enum(['public', 'confidential'])
      .optional()
      .describe(
        `Type of the client. Optional. If not provided, will be inferred from token_endpoint_auth_method or defaults to 'confidential'.
Public clients are used for applications that cannot securely store credentials (e.g., SPAs, mobile apps).
Confidential clients can securely store credentials (e.g., server-side applications).`,
      ),
    token_endpoint_auth_method: z
      .enum(['none', 'client_secret_basic', 'client_secret_post'])
      .optional()
      .describe(
        `Authentication method for the token endpoint. Optional.
'none' is for public clients, 'client_secret_basic' and 'client_secret_post' are for confidential clients.
If provided, must be consistent with client_type. If not provided, will be inferred from client_type.`,
      ),
    grant_types: z
      .array(z.enum(['authorization_code', 'refresh_token']))
      .optional()
      .describe(
        'OAuth grant types the client will use (defaults to both if not specified)',
      ),
    response_types: z
      .array(z.literal('code'))
      .optional()
      .describe('OAuth response types the client can use'),
    scope: z
      .string()
      .optional()
      .describe('Space-separated list of scope values'),
  })
  .passthrough();

export type OAuthClientsBody = z.infer<typeof OAuthClientsBodySchema>;

export const OAuthClientsBodyJsonSchema = zodToJsonSchema(
  OAuthClientsBodySchema,
  {
    name: 'OAuthClientsBody',
  },
);

const OAuthTokenResponseSchema = z
  .object({
    access_token: z.string().describe('The access token'),

    token_type: z.string().describe('Type of token issued').default('Bearer'),

    expires_in: z
      .number()
      .int()
      .describe('Lifetime in seconds of the access token'),

    refresh_token: z.string().describe('Refresh token (if applicable)'),

    scope: z.string().describe('Authorized scopes'),
    id_token: z
      .string()
      .optional()
      .describe(
        'OpenID Connect ID token (included only if openid scope was requested in the authorization request)',
      ),
  })
  .partial()
  .passthrough();

export type OAuthTokenResponse = z.infer<typeof OAuthTokenResponseSchema>;

export const OAuthTokenResponseJsonSchema = zodToJsonSchema(
  OAuthTokenResponseSchema,
  {
    name: 'OAuthTokenResponse',
  },
);

const OAuthAuthorizationResponseSchema = z
  .object({
    authorization_id: z.string(),
    redirect_uri: z.string().url(),
    client: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
        uri: z.string().url(),
        logo_uri: z.string().url(),
      })
      .partial()
      .passthrough(),
    user: z
      .object({id: z.string().uuid(), email: z.string().email()})
      .partial()
      .passthrough(),
    scope: z.string(),
  })
  .partial()
  .passthrough();

export type OAuthAuthorizationResponse = z.infer<
  typeof OAuthAuthorizationResponseSchema
>;

export const OAuthAuthorizationResponseJsonSchema = zodToJsonSchema(
  OAuthAuthorizationResponseSchema,
  {
    name: 'OAuthAuthorizationResponse',
  },
);

const OAuthAuthorizationsAuthorizationIdConsentBodySchema = z
  .object({
    action: z
      .enum(['approve', 'deny'])
      .describe('Whether to approve or deny the authorization'),
  })
  .passthrough();

export type OAuthAuthorizationsAuthorizationIdConsentBody = z.infer<
  typeof OAuthAuthorizationsAuthorizationIdConsentBodySchema
>;

export const OAuthAuthorizationsAuthorizationIdConsentBodyJsonSchema =
  zodToJsonSchema(OAuthAuthorizationsAuthorizationIdConsentBodySchema, {
    name: 'OAuthAuthorizationsAuthorizationIdConsentBody',
  });

const OAuthConsentResponseSchema = z
  .object({redirect_url: z.string().url()})
  .partial()
  .passthrough();

export type OAuthConsentResponse = z.infer<typeof OAuthConsentResponseSchema>;

export const OAuthConsentResponseJsonSchema = zodToJsonSchema(
  OAuthConsentResponseSchema,
  {
    name: 'OAuthConsentResponse',
  },
);
