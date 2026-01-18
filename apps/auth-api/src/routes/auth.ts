import type {FastifyPluginAsync} from 'fastify';
import {
  MagiclinkBody,
  OtpBody,
  ResendBody,
  TokenBody,
  VerifyTokenBody,
} from '../openapi/schemas/auth.schema.js';
import {RecoverBody, SignupBody} from '../openapi/index.js';
import {
  issueOAuthToken,
  logoutUser,
  resendOtp,
  sendMagiclink,
  sendOTP,
  sendRecoveryEmail,
  signupUser,
  verifyOneTimeToken,
  verifyTokenAndIssue,
} from '../services/auth.js';

const authRoutes: FastifyPluginAsync = async app => {
  // POST /token
  app.post<{
    Querystring: {
      grant_type: 'password' | 'refresh_token' | 'id_token' | 'pkce' | 'web3';
    };
    Body: TokenBody;
  }>(
    '/token',
    {
      schema: {
        tags: ['auth'],
        operationId: 'AuthController_issueToken',
        summary: 'Issues access and refresh tokens based on grant type.',

        querystring: {
          type: 'object',
          required: ['grant_type'],
          properties: {
            grant_type: {
              type: 'string',
              enum: ['password', 'refresh_token', 'id_token', 'pkce', 'web3'],
              description: `
- What grant type should be used to issue an access and refresh token. Note: \`id_token\` is only offered in experimental mode. 

- CAPTCHA protection does not apply on the \`refresh_token\` grant flow.

- Using \`password\` is akin to a user signing in. 

- \`pkce\` is used for exchanging the authorization code for a pair of access and refresh tokens.
`,
            },
          },
        },

        body: {
          type: 'object',
          description: `
    For refresh token: refresh_token
    For password: email/phone + password
    For id_token: id_token, nonce, provider, client_id, issuer
    For PKCE: auth_code, code_verifier
    For Web3: message, signature, chain
            `,
          $ref: 'TokenBody',
        },

        response: {
          200: {
            description: 'Access and refresh token successfully issued.',
            $ref: 'AccessTokenResponse',
          },
          400: {$ref: 'BadRequestResponse'},
          401: {$ref: 'UnAuthorizedResponse'},
          403: {$ref: 'ForbiddenResponse'},
          429: {$ref: 'RateLimitResponse'},
          500: {$ref: 'InternalServerErrorResponse'},
        },
      },
    },
    async (request, reply) => {
      const {grant_type} = request.query;
      const token = await issueOAuthToken(grant_type, request.body);
      return reply.send(token);
    },
  );

  // POST /logout
  app.post<{
    Querystring: {
      scope?: 'global' | 'local' | 'others';
    };
  }>(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Logs out a user.',
        operationId: 'AuthController_logout',
        querystring: {
          type: 'object',
          properties: {
            scope: {
              type: 'string',
              enum: ['global', 'local', 'others'],
              description:
                'Determines how the user should be logged out: global, local, or others.',
            },
          },
        },
        response: {
          204: {
            description: 'No content returned on successful logout.',
            type: 'null',
          },
          401: {$ref: 'UnAuthorizedResponse'},
        },
      },
    },
    async (request, reply) => {
      const scope = request.query.scope ?? 'local';

      await logoutUser({
        scope,
        accessToken: request.headers.authorization,
      });

      return reply.code(204).send();
    },
  );

  // --- GET /verify ---
  app.get<{
    Querystring: {
      token: string;
      type: 'signup' | 'invite' | 'recovery' | 'magiclink' | 'email_change';
      redirect_to?: string;
    };
  }>(
    '/verify',
    {
      schema: {
        tags: ['auth'],
        summary:
          'Authenticate by verifying the possession of a one-time token. Usually for clickable links.',
        operationId: 'AuthController_verifyOneTimeToken',
        querystring: {
          type: 'object',
          required: ['token', 'type'],
          properties: {
            token: {type: 'string'},
            type: {
              type: 'string',
              enum: [
                'signup',
                'invite',
                'recovery',
                'magiclink',
                'email_change',
              ],
            },
            redirect_to: {
              type: 'string',
              format: 'uri',
              description: '(Optional) URL to redirect after verification.',
            },
          },
        },
        response: {
          302: {$ref: 'AccessRefreshTokenRedirectResponse'},
        },
      },
    },
    async (request, reply) => {
      const {token, type, redirect_to} = request.query;

      // Perform verification logic
      const redirectUrl = await verifyOneTimeToken({token, type, redirect_to});

      // Respond with 302 redirect
      return reply.header('Location', redirectUrl).code(302).send();
    },
  );

  app.post<{Body: VerifyTokenBody}>(
    '/verify',
    {
      schema: {
        tags: ['auth'],
        summary:
          'Authenticate by verifying the possession of a one-time token.',
        operationId: 'AuthController_verifyTokenAndIssue',
        body: {$ref: 'VerifyTokenBody'},
        response: {
          200: {
            description: ' An access and refresh token.',
            $ref: 'AccessTokenResponse',
          },
          429: {$ref: 'RateLimitResponse'},
        },
      },
    },
    async (request, reply) => {
      const tokenResponse = await verifyTokenAndIssue(request.body);
      return reply.send(tokenResponse);
    },
  );

  // --- POST /signup ---
  app.post<{Body: SignupBody}>(
    '/signup',
    {
      schema: {
        tags: ['auth'],
        summary: 'Signs a user up.',
        description: 'Creates a new user.',
        operationId: 'AuthController_signupUser',
        body: {$ref: 'SignupBody'},
        response: {
          200: {
            description:
              'A user already exists and is not confirmed (in which case a user object is returned). ' +
              'A user did not exist and is signed up. If email or phone confirmation is enabled, returns a user object. ' +
              'If confirmation is disabled, returns an access token and refresh token response.',
            oneOf: [{$ref: 'AccessTokenResponse'}, {$ref: 'UserResponse'}],
          },
          400: {$ref: 'BadRequestResponse'},
          429: {$ref: 'RateLimitResponse'},
        },
      },
    },
    async (request, reply) => {
      const {
        email,
        phone,
        password,
        channel,
        data,
        code_challenge,
        code_challenge_method,
        meta_security,
      } = request.body;

      // Implement your signup logic here
      // It should return either:
      // 1) an access token response (if confirmation is disabled)
      // 2) a user object (if confirmation is required)
      const signupResult = await signupUser({
        email,
        phone,
        password,
        channel,
        data,
        code_challenge,
        code_challenge_method,
        meta_security,
      });

      return reply.send(signupResult);
    },
  );

  app.post<{Body: RecoverBody}>(
    '/recover',
    {
      schema: {
        tags: ['auth'],
        summary: 'Request password recovery.',
        operationId: 'AuthController_sendRecoveryEmail',
        description:
          'Users that have forgotten their password can have it reset with this API.',
        body: {
          type: 'object',
          $ref: 'RecoverBody',
        },
        response: {
          200: {
            description:
              'A One-Time Password was sent to the email or phone. To obfuscate whether such an address or number already exists in the system this response is sent in both cases.',
            $ref: 'ResendResponse',
          },
          400: {$ref: 'BadRequestResponse'},
          422: {
            description: 'Returned when unable to validate the email address.',
            $ref: 'ErrorResponse',
          },
          429: {$ref: 'RateLimitResponse'},
        },
      },
    },
    async (request, reply) => {
      const {email, code_challenge, code_challenge_method, meta_security} =
        request.body;

      // Implement the logic to send a recovery email
      await sendRecoveryEmail({
        email,
        code_challenge,
        code_challenge_method,
        meta_security,
      });

      // Return an empty JSON object
      return reply.status(200).send({});
    },
  );

  app.post<{Body: ResendBody}>(
    '/resend',
    {
      schema: {
        tags: ['auth'],
        summary: 'Resends a one-time password (OTP) through email or SMS.',
        description:
          'Allows a user to resend an existing signup, sms, email_change or phone_change OTP.',
        operationId: 'AuthController_sendRecoveryEmail',
        body: {
          type: 'object',
          $ref: 'ResendBody',
        },
        response: {
          200: {
            description:
              'A One-Time Password was sent to the email or phone. To obfuscate whether such an address or number already exists in the system this response is sent in both cases.',
            $ref: 'ResendResponse',
          },
          400: {$ref: 'BadRequestResponse'},
          422: {$ref: 'ErrorResponse'},
          429: {$ref: 'RateLimitResponse'},
        },
      },
    },
    async (request, reply) => {
      const body = request.body;

      // Call your service to resend OTP
      const response = await resendOtp(body);

      return reply.send(response);
    },
  );

  app.post<{Body: MagiclinkBody}>(
    '/magiclink',
    {
      schema: {
        tags: ['auth'],
        summary: 'Authenticate a user by sending them a magic link.',
        description:
          'A magic link is a special type of URL that includes a One-Time Password. When a user visits this link in a browser they are immediately authenticated.',
        operationId: 'AuthController_sendMagiclink',
        body: {
          type: 'object',
          $ref: 'MagiclinkBody',
        },
        response: {
          200: {
            description:
              'A magic link has been sent to the email. Returns empty JSON object regardless of whether the email exists.',
            type: 'object',
            properties: {},
          },
          400: {$ref: 'BadRequestResponse'},
          422: {$ref: 'ErrorResponse'},
          429: {$ref: 'RateLimitResponse'},
        },
      },
    },
    async (request, reply) => {
      const body = request.body;

      // Call service to send magic link
      const response = await sendMagiclink(body);

      return reply.send(response);
    },
  );

  app.post<{Body: OtpBody}>(
    '/otp',
    {
      schema: {
        tags: ['auth'],
        summary:
          'Authenticate a user by sending them a One-Time Password over email or SMS.',
        operationId: 'AuthController_sendOTP',
        body: {
          type: 'object',
          $ref: 'OtpBody',
        },
        response: {
          200: {
            description:
              'A One-Time Password was sent to the email or phone. To obfuscate whether such an address or number already exists in the system this response is sent in both cases.',
            $ref: 'OTPResponse',
          },
          400: {
            desription:
              'Returned when unable to validate the email or phone number.',
            $ref: 'BadRequestResponse',
          },
          422: {$ref: 'ErrorResponse'},
          429: {$ref: 'RateLimitResponse'},
        },
      },
    },
    async (request, reply) => {
      const body = request.body;

      // Call service to send OTP
      const response = await sendOTP(body);

      return reply.send(response);
    },
  );
};

export default authRoutes;
