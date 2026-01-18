import {z} from 'zod';
import {zodToJsonSchema} from '../utils/zod-to-json-schema.js';
import {MetaSecurity} from './auth.schema.js';

const SSOBodySchema = z
  .object({
    domain: z
      .string()
      .describe('Email address domain used to identify the SSO provider.'),

    provider_id: z.string().uuid().describe('SSO provider UUID'),

    redirect_to: z.string().url().optional(),

    skip_http_redirect: z
      .boolean()
      .optional()
      .describe(
        'Set to true if the response should not be a HTTP 303 redirect (useful for browser-based apps).',
      ),

    code_challenge: z.string().optional(),

    code_challenge_method: z.enum(['plain', 's256']).optional(),
    meta_security: MetaSecurity,
  })
  .partial()
  .passthrough();

export type SSOBody = z.infer<typeof SSOBodySchema>;

export const SSOBodyJsonSchema = zodToJsonSchema(SSOBodySchema, {
  name: 'SSOBody',
});
