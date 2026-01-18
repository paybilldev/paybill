import {z} from 'zod';
import {zodToJsonSchema} from '../utils/zod-to-json-schema.js';

const RateLimitErrorResponseSchema = z.object({
  code: z.number().int().describe('HTTP status code').default(429),

  msg: z
    .string()
    .describe(
      'A basic message describing the rate limit breach. Do not use as an error code identifier.',
    ),
});

export type RateLimitErrorResponse = z.infer<
  typeof RateLimitErrorResponseSchema
>;

export const RateLimitErrorResponseJsonSchema = zodToJsonSchema(
  RateLimitErrorResponseSchema,
  {name: 'RateLimitErrorResponse'},
);

const ErrorSchema = z
  .object({
    error: z.string().describe(
      `Certain responses will contain this property.

Usually one of:
- invalid_request
- unauthorized_client
- access_denied
- server_error
- temporarily_unavailable
- unsupported_otp_type`,
    ),

    error_description: z
      .string()
      .describe(
        'Certain responses that have an `error` property may have this property which describes the error.',
      ),

    code: z
      .number()
      .int()
      .describe('The HTTP status code. Usually missing if `error` is present.'),

    msg: z
      .string()
      .describe(
        'A basic message describing the problem with the request. Usually missing if `error` is present.',
      ),

    error_code: z
      .string()
      .describe(
        'A short code used to describe the class of error encountered.',
      ),

    weak_password: z
      .object({
        reasons: z.array(
          z
            .enum(['length', 'characters', 'pwned'])
            .describe('Why the password is considered weak.'),
        ),
      })
      .describe(
        'Only returned on the `/signup` endpoint if the password used is too weak. Inspect the `reasons` and `msg` property to identify the causes.',
      )
      .partial()
      .passthrough(),
  })
  .partial()
  .passthrough();

export type ErrorResponse = z.infer<typeof ErrorSchema>;

export const ErrorResponseJsonSchema = zodToJsonSchema(ErrorSchema, {
  name: 'ErrorResponse',
});
