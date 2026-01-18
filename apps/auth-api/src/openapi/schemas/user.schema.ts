import {z} from 'zod';
import {zodToJsonSchema} from '../utils/zod-to-json-schema.js';
import {UserSchema} from './auth.schema.js';

const UserBodySchema = z
  .object({
    email: z
      .string()
      .email()
      .optional()
      .describe('New email address for the user.'),
    phone: z.string().optional().describe('New phone number for the user.'),
    password: z.string().optional().describe('New password for the user.'),
    nonce: z
      .string()
      .optional()
      .describe('Nonce for certain validation flows.'),
    data: z
      .object({})
      .partial()
      .passthrough()
      .optional()
      .describe('Custom user metadata.'),
    app_metadata: z
      .object({})
      .partial()
      .passthrough()
      .optional()
      .describe('App metadata.'),
    channel: z
      .enum(['sms', 'whatsapp'])
      .optional()
      .describe('Preferred channel for notifications.'),
  })
  .partial()
  .passthrough();

export type UserBody = z.infer<typeof UserBodySchema>;
export const UserBodyJsonSchema = zodToJsonSchema(UserBodySchema, {
  name: 'UserBody',
});

const LinkIdentityQuerySchema = z.object({
  provider: z
    .string()
    .regex(/^[a-zA-Z0-9]+$/)
    .describe('Name of the OAuth provider.'),
  scopes: z
    .string()
    .regex(/[^ ]+( +[^ ]+)*/)
    .describe(
      'Space separated list of OAuth scopes to pass on to the provider.',
    ),
  redirect_to: z
    .string()
    .url()
    .optional()
    .describe('Optional URL to redirect back after OAuth completes.'),
  code_challenge_method: z
    .enum(['plain', 's256'])
    .optional()
    .describe('Method used to encrypt the verifier. Recommended: s256.'),
});

export type LinkIdentityQuery = z.infer<typeof LinkIdentityQuerySchema>;
export const LinkIdentityQueryJsonSchema = zodToJsonSchema(
  LinkIdentityQuerySchema,
  {
    name: 'LinkIdentityQuery',
  },
);

const IdentityIdParamSchema = z.object({
  identityId: z
    .string()
    .uuid()
    .describe('UUID of the identity to unlink from the current user'),
});

export type IdentityIdParams = z.infer<typeof IdentityIdParamSchema>;

export const IdentityIdParamsJsonSchema = zodToJsonSchema(
  IdentityIdParamSchema,
  {
    name: 'IdentityIdParams',
  },
);

const OAuthGrantClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  uri: z.string().url().optional(),
  logo_uri: z.string().url().optional(),
});

const OAuthGrantSchema = z.object({
  client: OAuthGrantClientSchema,
  scopes: z.array(z.string()),
  granted_at: z.string(), // ISO datetime string
});

const OAuthGrantListSchema = z.array(OAuthGrantSchema);

export type OAuthGrantResponse = z.infer<typeof OAuthGrantSchema>;

export const OAuthGrantResponseJsonSchema = zodToJsonSchema(OAuthGrantSchema, {
  name: 'OAuthGrantResponse',
});

export type OAuthGrantListResponse = z.infer<typeof OAuthGrantListSchema>;

export const OAuthGrantListResponseJsonSchema = zodToJsonSchema(
  OAuthGrantListSchema,
  {
    name: 'OAuthGrantListResponse',
  },
);

// For DELETE query parameter
const RevokeGrantQuerySchema = z.object({
  client_id: z.string().uuid(),
});

export type RevokeGrantQuery = z.infer<typeof RevokeGrantQuerySchema>;

export const RevokeGrantQueryJsonSchema = zodToJsonSchema(
  RevokeGrantQuerySchema,
  {
    name: 'RevokeGrantQuery',
  },
);

const FactorsBodySchema = z
  .object({
    factor_type: z.enum(['totp', 'phone', 'webauthn']),
    friendly_name: z.string().optional(),
    issuer: z.string().url().optional(),
    phone: z.string().optional(),
  })
  .passthrough();

export type FactorsBody = z.infer<typeof FactorsBodySchema>;

export const FactorsBodyJsonSchema = zodToJsonSchema(FactorsBodySchema, {
  name: 'FactorsBody',
});

const FactorResponseSchema = z
  .object({
    id: z.string(),
    type: z.enum(['totp', 'phone', 'webauthn']),
    totp: z
      .object({qr_code: z.string(), secret: z.string(), uri: z.string()})
      .partial()
      .passthrough(),
    phone: z.string(),
  })
  .partial()
  .passthrough();

export type FactorResponse = z.infer<typeof FactorResponseSchema>;

export const FactorResponseJsonSchema = zodToJsonSchema(FactorResponseSchema, {
  name: 'FactorResponse',
});

const FactorsIdChallengeBodySchema = z
  .object({
    channel: z.enum(['sms', 'whatsapp']),
    webauthn: z
      .object({
        rpId: z
          .string()
          .describe('The relying party identifier (usually the domain)'),
        rpOrigins: z
          .array(z.string())
          .min(1)
          .describe('List of allowed origins for WebAuthn'),
      })
      .passthrough(),
  })
  .partial()
  .passthrough();

export type FactorsIdChallengeBody = z.infer<
  typeof FactorsIdChallengeBodySchema
>;

export const FactorsIdChallengeBodyJsonSchema = zodToJsonSchema(
  FactorsIdChallengeBodySchema,
  {
    name: 'FactorsIdChallengeBody',
  },
);

const TOTPPhoneChallengeResponseSchema = z
  .object({
    id: z.string().uuid().describe('ID of the challenge.'),
    type: z.enum(['totp', 'phone']).describe('Type of the challenge.'),
    expires_at: z
      .number()
      .int()
      .describe(
        'UNIX seconds of the timestamp past which the challenge should not be verified.',
      ),
  })
  .passthrough();

export type TOTPPhoneChallengeResponse = z.infer<
  typeof TOTPPhoneChallengeResponseSchema
>;

export const TOTPPhoneChallengeResponseJsonSchema = zodToJsonSchema(
  TOTPPhoneChallengeResponseSchema,
  {
    name: 'TOTPPhoneChallengeResponse',
  },
);

const PublicKeyCredentialDescriptorSchema = z.object({
  type: z.literal('public-key').describe('Credential type'),
  id: z.string().describe('Credential ID (base64url)'),
  transports: z
    .array(z.enum(['usb', 'nfc', 'ble', 'internal', 'hybrid']))
    .optional()
    .describe('Supported transports for this credential'),
});

const CredentialCreationOptionsSchema = z.object({
  rp: z.object({
    id: z.string().describe('Relying Party ID (usually the domain)'),
    name: z.string().describe('Human-readable Relying Party name'),
  }),

  user: z.object({
    id: z.string().describe('User handle (base64url or opaque string)'),
    name: z
      .string()
      .describe('User account identifier (e.g., username or email)'),
    displayName: z.string().describe('Human-readable user display name'),
  }),

  challenge: z.string().describe('Base64url-encoded challenge'),

  pubKeyCredParams: z.array(
    z.object({
      type: z.literal('public-key'),
      alg: z.number().int().describe('COSE algorithm identifier'),
    }),
  ),

  timeout: z.number().int().optional().describe('Timeout in milliseconds'),

  excludeCredentials: z
    .array(PublicKeyCredentialDescriptorSchema)
    .optional()
    .describe('Credentials to exclude'),

  authenticatorSelection: z
    .object({
      authenticatorAttachment: z
        .enum(['platform', 'cross-platform'])
        .optional()
        .describe('Preferred authenticator type'),
      requireResidentKey: z
        .boolean()
        .optional()
        .describe('Deprecated, use residentKey'),
      residentKey: z
        .enum(['required', 'preferred', 'discouraged'])
        .optional()
        .describe('Resident key requirement'),
      userVerification: z
        .enum(['required', 'preferred', 'discouraged'])
        .optional()
        .describe('User verification requirement'),
    })
    .optional(),

  attestation: z
    .enum(['none', 'indirect', 'direct', 'enterprise'])
    .optional()
    .describe('Attestation conveyance preference'),

  attestationFormats: z
    .array(z.string())
    .optional()
    .describe('Preferred attestation formats'),

  hints: z
    .array(z.enum(['security-key', 'client-device', 'hybrid']))
    .optional()
    .describe('Authenticator hints'),

  extensions: z.record(z.any()).optional().describe('WebAuthn extensions'),
});

const CredentialRequestOptionsSchema = z.object({
  challenge: z.string().describe('Base64url-encoded challenge'),

  timeout: z.number().int().optional().describe('Timeout in milliseconds'),

  rpId: z.string().optional().describe('Relying Party ID'),

  allowCredentials: z
    .array(PublicKeyCredentialDescriptorSchema)
    .optional()
    .describe('Acceptable credentials for authentication'),

  userVerification: z
    .enum(['required', 'preferred', 'discouraged'])
    .optional()
    .describe('User verification requirement'),

  hints: z
    .array(z.enum(['security-key', 'client-device', 'hybrid']))
    .optional()
    .describe('Authenticator hints'),

  extensions: z.record(z.any()).optional().describe('WebAuthn extensions'),
});

const WebAuthnCreateSchema = z.object({
  type: z.literal('create').describe('Credential creation operation'),
  credential_options: z.object({
    publicKey: CredentialCreationOptionsSchema,
  }),
});

const WebAuthnRequestSchema = z.object({
  type: z.literal('request').describe('Credential request operation'),
  credential_options: z.object({
    publicKey: CredentialRequestOptionsSchema,
  }),
});

export const WebAuthnChallengeResponseSchema = z.object({
  id: z.string().uuid().describe('ID of the challenge'),

  type: z.literal('webauthn').describe('Type of the challenge'),

  expires_at: z
    .number()
    .int()
    .optional()
    .describe(
      'UNIX seconds of the timestamp past which the challenge should not be verified',
    ),

  webauthn: z.discriminatedUnion('type', [
    WebAuthnCreateSchema,
    WebAuthnRequestSchema,
  ]),
});

export type WebAuthnChallengeResponse = z.infer<
  typeof WebAuthnChallengeResponseSchema
>;

export const WebAuthnChallengeResponseJsonSchema = zodToJsonSchema(
  WebAuthnChallengeResponseSchema,
  {
    name: 'WebAuthnChallengeResponse',
  },
);

const FactorDeleteResponseSchema = z
  .object({id: z.string().uuid()})
  .partial()
  .passthrough();

export type FactorDeleteResponse = z.infer<typeof FactorDeleteResponseSchema>;

export const FactorDeleteResponseJsonSchema = zodToJsonSchema(
  FactorDeleteResponseSchema,
  {
    name: 'FactorDeleteResponse',
  },
);

const UserListResponseSchema = z
  .object({aud: z.string(), users: z.array(UserSchema)})
  .partial()
  .passthrough();

export type UserListResponse = z.infer<typeof UserListResponseSchema>;

export const UserListResponseJsonSchema = zodToJsonSchema(
  UserListResponseSchema,
  {
    name: 'UserListResponse',
  },
);

const FactorsIdVerifyBodySchema = z
  .object({
    challenge_id: z.string().uuid(),
    code: z.string().optional(),
    webauthn: z
      .object({
        rpId: z.string().describe('The relying party identifier'),
        rpOrigins: z
          .array(z.string())
          .min(1)
          .describe('List of allowed origins for WebAuthn'),
        type: z
          .enum(['create', 'request'])
          .describe('Type of WebAuthn operation'),
        credential_response: z
          .object({})
          .partial()
          .passthrough()
          .describe('WebAuthn credential response from the client'),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type FactorsIdVerifyBody = z.infer<typeof FactorsIdVerifyBodySchema>;

export const FactorsIdVerifyBodyJsonSchema = zodToJsonSchema(
  FactorsIdVerifyBodySchema,
  {
    name: 'FactorsIdVerifyBody',
  },
);

const VerifyBodySchema = z
  .object({
    type: z.enum([
      'signup',
      'recovery',
      'invite',
      'magiclink',
      'email_change',
      'sms',
      'phone_change',
    ]),
    token: z.string(),
    token_hash: z.string(),
    email: z.string().email(),
    phone: z.string(),
    redirect_to: z.string().url(),
  })
  .partial()
  .passthrough();

export type VerifyBody = z.infer<typeof VerifyBodySchema>;

export const VerifyBodyJsonSchema = zodToJsonSchema(VerifyBodySchema, {
  name: 'VerifyBody',
});
