import {z} from 'zod';
import {zodToJsonSchema} from '../utils/zod-to-json-schema.js';

export const SettingsResponseSchema = z.object({
  disable_signup: z
    .boolean()
    .describe(
      'Whether new accounts can be created. (Valid for all providers.)',
    ),

  mailer_autoconfirm: z
    .boolean()
    .describe(
      'Whether new email addresses need to be confirmed before sign-in is possible.',
    ),

  phone_autoconfirm: z
    .boolean()
    .describe(
      'Whether new phone numbers need to be confirmed before sign-in is possible.',
    ),

  sms_provider: z
    .string()
    .optional()
    .describe(
      'Which SMS provider is being used to send messages to phone numbers.',
    ),

  saml_enabled: z
    .boolean()
    .describe('Whether SAML is enabled on this API server. Defaults to false.'),

  external: z
    .record(z.boolean())
    .describe('Which external identity providers are enabled.'),
});

export type SettingsResponse = z.infer<typeof SettingsResponseSchema>;

export const SettingsResponseJsonSchema = zodToJsonSchema(
  SettingsResponseSchema,
  {
    name: 'SettingsResponse',
  },
);

const InviteBodySchema = z
  .object({
    email: z.string(),
    data: z.object({}).partial().passthrough().optional(),
  })
  .passthrough();

export type InviteBody = z.infer<typeof InviteBodySchema>;

export const InviteBodyJsonSchema = zodToJsonSchema(InviteBodySchema, {
  name: 'InviteBody',
});
