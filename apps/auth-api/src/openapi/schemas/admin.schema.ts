import {z} from 'zod';
import {zodToJsonSchema} from '../utils/zod-to-json-schema.js';

const SAMLAttributeMappingSchema = z
  .object({keys: z.object({}).partial().passthrough()})
  .partial()
  .passthrough();

const SSOProviderSchema = z
  .object({
    id: z.string().uuid(),
    sso_domains: z.array(
      z.object({domain: z.string().url()}).partial().passthrough(),
    ),
    saml: z
      .object({
        entity_id: z.string(),
        metadata_xml: z.string(),
        metadata_url: z.string(),
        attribute_mapping: SAMLAttributeMappingSchema,
      })
      .partial()
      .passthrough(),
  })
  .partial()
  .passthrough();

export type SSOProviderResponse = z.infer<typeof SSOProviderSchema>;

export const SSOProviderResponseJsonSchema = zodToJsonSchema(
  SSOProviderSchema,
  {
    name: 'SSOProviderResponse',
  },
);

const SSOProvidersBodySchema = z
  .object({
    type: z.literal('saml'),
    metadata_url: z.string().url().optional(),
    metadata_xml: z.string().optional(),
    domains: z.array(z.string().url()).optional(),
    attribute_mapping: SAMLAttributeMappingSchema.optional(),
  })
  .passthrough();

export type SSOProvidersBody = z.infer<typeof SSOProvidersBodySchema>;

export const SSOProvidersBodyJsonSchema = zodToJsonSchema(
  SSOProvidersBodySchema,
  {
    name: 'SSOProvidersBody',
  },
);

const SSOProviderListResponseSchema = z
  .object({items: z.array(SSOProviderSchema)})
  .partial()
  .passthrough();

export type SSOProviderListResponse = z.infer<
  typeof SSOProviderListResponseSchema
>;

export const SSOProviderListResponseJsonSchema = zodToJsonSchema(
  SSOProviderListResponseSchema,
  {
    name: 'SSOProviderListResponse',
  },
);

const SSOProvidersSSOProviderIdBodySchema = z
  .object({
    metadata_url: z.string().url(),
    metadata_xml: z.string(),
    domains: z.array(z.string().regex(/[a-z0-9-]+([.][a-z0-9-]+)*/)),
    attribute_mapping: SAMLAttributeMappingSchema,
  })
  .partial()
  .passthrough();

export type SSOProvidersSSOProviderIdBody = z.infer<
  typeof SSOProvidersSSOProviderIdBodySchema
>;

export const SSOProvidersSSOProviderIdBodyJsonSchema = zodToJsonSchema(
  SSOProvidersSSOProviderIdBodySchema,
  {
    name: 'SSOProvidersSSOProviderIdBody',
  },
);

const AuditLogResponseSchema = z.array(
  z
    .object({
      id: z.string().uuid(),
      payload: z
        .object({
          actor_id: z.string(),
          actor_via_sso: z
            .boolean()
            .describe(
              'Whether the actor used a SSO protocol (like SAML 2.0 or OIDC) to authenticate.',
            ),
          actor_username: z.string(),
          actor_name: z.string(),
          traits: z.object({}).partial().passthrough(),
          action: z.string().describe(`Usually one of these values:
                            - login
                            - logout
                            - invite_accepted
                            - user_signedup
                            - user_invited
                            - user_deleted
                            - user_modified
                            - user_recovery_requested
                            - user_reauthenticate_requested
                            - user_confirmation_requested
                            - user_repeated_signup
                            - user_updated_password
                            - token_revoked
                            - token_refreshed
                            - generate_recovery_codes
                            - factor_in_progress
                            - factor_unenrolled
                            - challenge_created
                            - verification_attempted
                            - factor_deleted
                            - recovery_codes_deleted
                            - factor_updated
                            - mfa_code_login
            `),
          log_type: z.string().describe(`Usually one of these values:
                            - account
                            - team
                            - token
                            - user
                            - factor
                            - recovery_codes
            `),
        })
        .partial()
        .passthrough(),
      created_at: z.string().datetime({offset: true}),
      ip_address: z.string(),
    })
    .partial()
    .passthrough(),
);

export type AuditLogResponse = z.infer<typeof AuditLogResponseSchema>;

export const AuditLogResponseJsonSchema = zodToJsonSchema(
  AuditLogResponseSchema,
  {
    name: 'AuditLogResponse',
  },
);

const VerificationResponseSchema = z
  .object({
    action_link: z.string().url(),
    email_otp: z.string(),
    hashed_token: z.string(),
    verification_type: z.string(),
    redirect_to: z.string().url(),
  })
  .partial()
  .passthrough();

export type VerificationResponse = z.infer<typeof VerificationResponseSchema>;

export const VerificationResponseJsonSchema = zodToJsonSchema(
  VerificationResponseSchema,
  {
    name: 'VerificationResponse',
  },
);

const OAuthClientsClientIdBodySchema = z
  .object({
    client_name: z
      .string()
      .describe('Human-readable name of the client application'),
    client_uri: z
      .string()
      .url()
      .describe("URL of the client application's homepage"),
    logo_uri: z.string().url().describe("URL of the client application's logo"),
    redirect_uris: z
      .array(z.string().url())
      .describe('Array of redirect URIs used by the client'),
    grant_types: z
      .array(z.enum(['authorization_code', 'refresh_token']))
      .describe('OAuth grant types the client is authorized to use'),
  })
  .partial()
  .passthrough();

export type OAuthClientsClientIdBody = z.infer<
  typeof OAuthClientsClientIdBodySchema
>;

export const OAuthClientsClientIdBodyJsonSchema = zodToJsonSchema(
  OAuthClientsClientIdBodySchema,
  {
    name: 'OAuthClientsClientIdBody',
  },
);

const GenerateLinkBodySchema = z
  .object({
    type: z.enum([
      'magiclink',
      'signup',
      'recovery',
      'email_change_current',
      'email_change_new',
    ]),
    email: z.string().email(),
    new_email: z.string().email().optional(),
    password: z.string().optional(),
    data: z.object({}).partial().passthrough().optional(),
    redirect_to: z.string().url().optional(),
  })
  .passthrough();

export type GenerateLinkBody = z.infer<typeof GenerateLinkBodySchema>;

export const GenerateLinkBodyJsonSchema = zodToJsonSchema(
  GenerateLinkBodySchema,
  {
    name: 'GenerateLinkBody',
  },
);
