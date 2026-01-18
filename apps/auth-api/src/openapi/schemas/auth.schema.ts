import {z} from 'zod';
import {zodToJsonSchema} from '../utils/zod-to-json-schema.js';

export const MetaSecurity = z
  .object({
    captcha_token: z.string().describe('CAPTCHA verification token'),
  })
  .partial()
  .passthrough();

const TokenBodySchema = z
  .object({
    refresh_token: z
      .string()
      .describe('Refresh token for the refresh_token grant flow'),

    password: z.string().describe('User password for the password grant flow'),

    email: z.string().email().describe('User email address'),

    phone: z.string().describe('User phone number'),

    id_token: z.string().describe('OIDC ID token for the id_token grant flow'),

    access_token: z
      .string()
      .describe(
        'Provide only when grant_type is id_token and the ID token contains an at_hash claim',
      ),

    nonce: z.string().describe('OIDC nonce used when validating the ID token'),

    provider: z
      .enum(['google', 'apple', 'azure', 'facebook', 'keycloak'])
      .describe('OIDC provider'),

    client_id: z.string().describe('OIDC client ID'),

    issuer: z
      .string()
      .describe(
        'If provider is azure, this is the Azure OIDC issuer used for verification',
      ),

    meta_security: MetaSecurity.describe('Additional auth security metadata'),

    auth_code: z
      .string()
      .uuid()
      .describe('Authorization code for PKCE exchange'),

    code_verifier: z.string().describe('PKCE code verifier'),

    message: z
      .string()
      .describe(
        'Signed message for Web3 authentication following SIWS or SIWE. Must include Issued At, URI, Version.',
      ),

    signature: z
      .string()
      .describe(
        'Signature of the Web3 message. Solana: Base64/Base64URL. Ethereum: 0x-prefixed hex.',
      ),

    chain: z
      .enum(['solana', 'ethereum'])
      .describe('Blockchain network for the Web3 signature'),
  })
  .partial()
  .passthrough();

export const TokenBodyJsonSchema = zodToJsonSchema(TokenBodySchema, {
  name: 'TokenBody',
});

export type TokenBody = z.infer<typeof TokenBodySchema>;

const MFAFactorResponseSchema = z
  .object({
    id: z.string().uuid().describe('MFA factor ID'),
    status: z.string().describe('verified | unverified'),
    friendly_name: z.string().describe('Human friendly device name'),
    factor_type: z.string().describe('totp | phone | webauthn'),
    webauthn_credential: z.string().describe('WebAuthn credential ID'),
    phone: z.string().nullable().describe('Associated phone number'),
    created_at: z.string().datetime({offset: true}),
    updated_at: z.string().datetime({offset: true}),
    last_challenged_at: z.string().datetime({offset: true}).nullable(),
  })
  .partial()
  .passthrough();

export type MFAFactorResponse = z.infer<typeof MFAFactorResponseSchema>;

export const MFAFactorResponseJsonSchema = zodToJsonSchema(
  MFAFactorResponseSchema,
  {
    name: 'MFAFactorResponse',
  },
);

const MFAFactorListResponseSchema = z.array(MFAFactorResponseSchema);

export type MFAFactorListResponse = z.infer<typeof MFAFactorListResponseSchema>;

export const MFAFactorListResponseJsonSchema = zodToJsonSchema(
  MFAFactorListResponseSchema,
  {
    name: 'MFAFactorListResponse',
  },
);

const IdentitySchema = z
  .object({
    identity_id: z.string().uuid(),
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    identity_data: z.object({}).partial().passthrough(),
    provider: z.string().describe('OAuth provider'),
    last_sign_in_at: z.string().datetime({offset: true}),
    created_at: z.string().datetime({offset: true}),
    updated_at: z.string().datetime({offset: true}),
    email: z.string().email(),
  })
  .partial()
  .passthrough();

export const UserSchema = z
  .object({
    id: z.string().uuid(),
    role: z.string(),
    email: z
      .string()
      .email()
      .describe(
        "User's primary contact email. May not always uniquely identify the user.",
      ),
    email_confirmed_at: z.string().datetime({offset: true}),
    phone: z
      .string()
      .describe(
        "User's primary contact phone number. May not always uniquely identify the user.",
      ),
    phone_confirmed_at: z.string().datetime({offset: true}),
    confirmation_sent_at: z.string().datetime({offset: true}),
    confirmed_at: z.string().datetime({offset: true}),
    recovery_sent_at: z.string().datetime({offset: true}),
    new_email: z.string().email(),
    email_change_sent_at: z.string().datetime({offset: true}),
    new_phone: z.string(),
    phone_change_sent_at: z.string().datetime({offset: true}),
    reauthentication_sent_at: z.string().datetime({offset: true}),
    last_sign_in_at: z.string().datetime({offset: true}),
    app_metadata: z.object({}).partial().passthrough(),
    user_metadata: z.object({}).partial().passthrough(),
    factors: z.array(MFAFactorResponseSchema),
    identities: z.array(IdentitySchema),
    banned_until: z.string().datetime({offset: true}),
    created_at: z.string().datetime({offset: true}),
    updated_at: z.string().datetime({offset: true}),
    deleted_at: z.string().datetime({offset: true}),
    is_anonymous: z.boolean(),
  })
  .partial()
  .passthrough();

export type UserResponse = z.infer<typeof UserSchema>;

export type UserBodyResponse = z.infer<typeof UserSchema>;

export const UserResponseJsonSchema = zodToJsonSchema(UserSchema, {
  name: 'UserResponse',
});

export const UserBodyResponseJsonSchema = zodToJsonSchema(UserSchema, {
  name: 'UserBodyResponse',
});

const AccessTokenResponseSchema = z
  .object({
    access_token: z
      .string()
      .describe('A valid JWT that will expire in `expires_in` seconds.'),

    refresh_token: z
      .string()
      .describe(
        'An opaque string that can be used once to obtain a new access and refresh token.',
      ),

    token_type: z
      .string()
      .describe(
        'What type of token this is. Only `bearer` returned, may change in the future.',
      ),

    expires_in: z
      .number()
      .int()
      .describe(
        'Number of seconds after which the `access_token` should be renewed using the refresh token.',
      ),

    expires_at: z
      .number()
      .int()
      .describe(
        'UNIX timestamp after which the `access_token` should be renewed using the refresh token.',
      ),

    weak_password: z
      .object({
        reasons: z.array(z.enum(['length', 'characters', 'pwned'])),
        message: z.string(),
      })
      .describe(
        'Returned only for password grant. Indicates the password is weak and why.',
      )
      .partial(),

    user: UserSchema.describe(
      'Object describing the user related to the issued access and refresh tokens.',
    ),
  })
  .partial()
  .passthrough();

export type AccessTokenResponse = z.infer<typeof AccessTokenResponseSchema>;

export const AccessTokenResponseJsonSchema = zodToJsonSchema(
  AccessTokenResponseSchema,
  {
    name: 'AccessTokenResponse',
  },
);

const VerifyTokenBodySchema = z
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
    token_hash: z
      .string()
      .optional()
      .describe(
        'The hashed value of token. Applicable only if used with `type` and nothing else.',
      ),
    email: z
      .string()
      .email()
      .optional()
      .describe(
        'Applicable only if `type` is with regards to an email address.',
      ),
    phone: z
      .string()
      .optional()
      .describe('Applicable only if `type` is with regards to a phone number.'),
    redirect_to: z
      .string()
      .url()
      .optional()
      .describe(
        '(Optional) URL to redirect back into the app on after verification completes successfully. If not specified will use the "Site URL" configuration option. If not allowed per the allow list it will use the "Site URL" configuration option.',
      ),
  })
  .strict(); // prevents extra properties

export type VerifyTokenBody = z.infer<typeof VerifyTokenBodySchema>;

/* ---------- Generate JSON Schema for Fastify ---------- */
export const VerifyTokenBodyJsonSchema = zodToJsonSchema(
  VerifyTokenBodySchema,
  {
    name: 'VerifyTokenBody',
  },
);

const SignupBodySchema = z
  .object({
    email: z.string().email(),
    phone: z.string(),
    channel: z.enum(['sms', 'whatsapp']),
    password: z.string(),
    data: z.object({}).partial().passthrough(),
    code_challenge: z.string(),
    code_challenge_method: z.enum(['plain', 's256']),
    meta_security: MetaSecurity,
  })
  .partial()
  .passthrough();

export type SignupBody = z.infer<typeof SignupBodySchema>;

export const SignupBodyJsonSchema = zodToJsonSchema(SignupBodySchema, {
  name: 'SignupBody',
});

const RecoverBodySchema = z
  .object({
    email: z.string().email(),
    code_challenge: z.string().optional(),
    code_challenge_method: z.enum(['plain', 's256']).optional(),
    meta_security: MetaSecurity.optional(),
  })
  .passthrough();

export type RecoverBody = z.infer<typeof RecoverBodySchema>;

export const RecoverBodyJsonSchema = zodToJsonSchema(RecoverBodySchema, {
  name: 'RecoverBody',
});

const ResendBodySchema = z
  .object({
    email: z
      .string()
      .email()
      .describe(
        'Applicable only if `type` is with regards to an email address.',
      ),
    phone: z
      .string()
      .describe('Applicable only if `type` is with regards to a phone number.'),
    type: z
      .enum(['signup', 'email_change', 'sms', 'phone_change'])
      .describe(
        'The type of OTP to resend: signup, email_change, sms, or phone_change.',
      ),
    meta_security: MetaSecurity.describe(
      'Optional security metadata for Auth. Usually contains captcha_token.',
    ),
  })
  .partial() // makes all properties optional
  .passthrough();

export type ResendBody = z.infer<typeof ResendBodySchema>;

export const ResendBodyJsonSchema = zodToJsonSchema(ResendBodySchema, {
  name: 'ResendBody',
});

const ResendResponseSchema = z
  .object({
    message_id: z
      .string()
      .optional()
      .describe(
        'Unique ID of the message as reported by the SMS sending provider. Useful for tracking deliverability problems.',
      ),
  })
  .passthrough();

export type ResendResponse = z.infer<typeof ResendResponseSchema>;

export const ResendResponseJsonSchema = zodToJsonSchema(ResendResponseSchema, {
  name: 'ResendResponse',
});

const MagiclinkBodySchema = z
  .object({
    email: z.string().email(),
    data: z.object({}).partial().passthrough().optional(),
    meta_security: MetaSecurity.optional(),
  })
  .passthrough();

export type MagiclinkBody = z.infer<typeof MagiclinkBodySchema>;

export const MagiclinkBodyJsonSchema = zodToJsonSchema(MagiclinkBodySchema, {
  name: 'MagiclinkBody',
});

const OtpBodySchema = z
  .object({
    email: z
      .string()
      .email()
      .optional()
      .describe('Send OTP to this email address.'),
    phone: z.string().optional().describe('Send OTP to this phone number.'),
    channel: z
      .enum(['sms', 'whatsapp'])
      .optional()
      .describe('Channel to send OTP.'),
    create_user: z
      .boolean()
      .optional()
      .describe('Whether to create a user if not exists.'),
    data: z
      .object({})
      .partial()
      .passthrough()
      .optional()
      .describe('Additional user metadata.'),
    code_challenge_method: z
      .enum(['plain', 's256'])
      .optional()
      .describe('PKCE code challenge method.'),
    code_challenge: z.string().optional().describe('PKCE code challenge.'),
    meta_security: MetaSecurity.optional().describe(
      'Optional Auth security metadata.',
    ),
  })
  .partial()
  .passthrough();

export type OtpBody = z.infer<typeof OtpBodySchema>;

export const OtpBodyJsonSchema = zodToJsonSchema(OtpBodySchema, {
  name: 'OtpBody',
});

const OTPResponseSchema = z
  .object({
    message_id: z
      .string()
      .optional()
      .describe(
        'Unique ID of the message as reported by the SMS sending provider. Useful for tracking deliverability problems.',
      ),
  })
  .passthrough();

export type OTPResponse = z.infer<typeof OTPResponseSchema>;
export const OTPResponseJsonSchema = zodToJsonSchema(OTPResponseSchema, {
  name: 'OTPResponse',
});
