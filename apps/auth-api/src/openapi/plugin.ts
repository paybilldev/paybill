import fastifySwagger, {type SwaggerOptions} from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type {FastifyInstance} from 'fastify';
import type {JsonSchema} from './utils/zod-to-json-schema.js';
import {
  InviteBodyJsonSchema,
  SettingsResponseJsonSchema,
} from './schemas/general.schema.js';
import {
  ErrorResponseJsonSchema,
  RateLimitErrorResponseJsonSchema,
} from './schemas/error.schema.js';
import {
  AccessTokenResponseJsonSchema,
  MagiclinkBodyJsonSchema,
  MFAFactorListResponseJsonSchema,
  MFAFactorResponseJsonSchema,
  OtpBodyJsonSchema,
  OTPResponseJsonSchema,
  RecoverBodyJsonSchema,
  ResendBodyJsonSchema,
  ResendResponseJsonSchema,
  SignupBodyJsonSchema,
  TokenBodyJsonSchema,
  UserBodyResponseJsonSchema,
  UserResponseJsonSchema,
  VerifyTokenBodyJsonSchema,
} from './schemas/auth.schema.js';
import {
  FactorDeleteResponseJsonSchema,
  FactorResponseJsonSchema,
  FactorsBodyJsonSchema,
  FactorsIdChallengeBodyJsonSchema,
  FactorsIdVerifyBodyJsonSchema,
  IdentityIdParamsJsonSchema,
  LinkIdentityQueryJsonSchema,
  OAuthGrantListResponseJsonSchema,
  OAuthGrantResponseJsonSchema,
  RevokeGrantQueryJsonSchema,
  TOTPPhoneChallengeResponseJsonSchema,
  UserBodyJsonSchema,
  UserListResponseJsonSchema,
  VerifyBodyJsonSchema,
  WebAuthnChallengeResponseJsonSchema,
} from './schemas/user.schema.js';

import {
  SSOProvidersBodyJsonSchema,
  SSOProvidersSSOProviderIdBodyJsonSchema,
  SSOProviderListResponseJsonSchema,
  SSOProviderResponseJsonSchema,
  AuditLogResponseJsonSchema,
  VerificationResponseJsonSchema,
  OAuthClientsClientIdBodyJsonSchema,
  GenerateLinkBodyJsonSchema,
} from './schemas/admin.schema.js';
import {
  OAuthAuthorizationResponseJsonSchema,
  OAuthAuthorizationsAuthorizationIdConsentBodyJsonSchema,
  OAuthClientListResponseJsonSchema,
  OAuthClientResponseJsonSchema,
  OAuthClientsBodyJsonSchema,
  OAuthConsentResponseJsonSchema,
  OAuthTokenBodyJsonSchema,
  OAuthTokenResponseJsonSchema,
} from './schemas/oauth-server.schema.js';
import {SSOBodyJsonSchema} from './schemas/sso.schema.js';

/* ---------- Types ---------- */

export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<
    string,
    {
      description?: string;
      default: string;
      enum?: string[];
    }
  >;
}

export interface OpenAPITag {
  name: string;
  description?: string;
}

export interface OpenAPIExternalDocs {
  description?: string;
  url: string;
}

export interface OpenAPIContact {
  name?: string;
  url?: string;
  email?: string;
}

export interface OpenAPILicense {
  name: string;
  url?: string;
}

export interface ErrorResponseDefinition {
  statusCode: number;
  description: string;
}

export interface MultipartBodySchema {
  url: string;
  schema: JsonSchema;
  errorResponses?: ErrorResponseDefinition[];
}

export interface OpenAPIOptions {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: OpenAPIContact;
  license?: OpenAPILicense;
  externalDocs?: OpenAPIExternalDocs;
  servers?: OpenAPIServer[];
  tags?: OpenAPITag[];
  routePrefix?: string;
  additionalSchemas?: Record<string, JsonSchema>;
  multipartBodies?: MultipartBodySchema[];
}

/* ---------- Plugin ---------- */

export async function registerOpenAPI(
  app: FastifyInstance,
  options: OpenAPIOptions,
): Promise<void> {
  const routePrefix = options.routePrefix ?? '/docs';

  app.addSchema({
    $id: 'TokenBody',
    ...(TokenBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'MFAFactorResponse',
    ...(MFAFactorResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'UserResponse',
    ...(UserResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'UserBodyResponse',
    ...(UserBodyResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'UserBody',
    ...(UserBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'MFAFactorListResponse',
    ...(MFAFactorListResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'AccessTokenResponse',
    ...(AccessTokenResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'VerifyBody',
    ...(VerifyBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'SignupBody',
    ...(SignupBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'RecoverBody',
    ...(RecoverBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'ResendBody',
    ...(ResendBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'MagiclinkBody',
    ...(MagiclinkBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'OtpBody',
    ...(OtpBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'FactorsBody',
    ...(FactorsBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'FactorsIdChallengeBody',
    ...(FactorsIdChallengeBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'TOTPPhoneChallengeResponse',
    ...(TOTPPhoneChallengeResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'FactorsIdVerifyBody',
    ...(FactorsIdVerifyBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'SSOBody',
    ...(SSOBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'InviteBody',
    ...(InviteBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'GenerateLinkBody',
    ...(GenerateLinkBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'SSOProviderResponse',
    ...(SSOProviderResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'SSOProvidersBody',
    ...(SSOProvidersBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'SSOProvidersSSOProviderIdBody',
    ...(SSOProvidersSSOProviderIdBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'OAuthClientResponse',
    ...(OAuthClientResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'OAuthClientsBody',
    ...(OAuthClientsBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'OAuthClientsClientIdBody',
    ...(OAuthClientsClientIdBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'OAuthTokenBody',
    ...(OAuthTokenBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'OAuthAuthorizationsAuthorizationIdConsentBody',
    ...(OAuthAuthorizationsAuthorizationIdConsentBodyJsonSchema as object),
  });

  app.addSchema({
    $id: 'AuditLogResponse',
    ...(AuditLogResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'VerificationResponse',
    ...(VerificationResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'OAuthClientListResponse',
    ...(OAuthClientListResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'SSOProviderListResponse',
    ...(SSOProviderListResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'UserListResponse',
    ...(UserListResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'FactorResponse',
    ...(FactorResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'FactorDeleteResponse',
    ...(FactorDeleteResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'OAuthAuthorizationResponse',
    ...(OAuthAuthorizationResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'OAuthConsentResponse',
    ...(OAuthConsentResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'OAuthTokenResponse',
    ...(OAuthTokenResponseJsonSchema as object),
  });

  const AccessRefreshTokenRedirectResponseSchema = {
    type: 'object',
    description:
      'HTTP See Other redirect response where `Location` is a specially formatted URL that includes an `access_token`, `refresh_token`, `expires_in` as URL fragment values.',
    headers: {
      Location: {
        type: 'string',
        format: 'uri',
        description:
          'Redirect URL containing access_token, refresh_token, and expires_in in the fragment (after #).',
        example:
          'https://example.com/#access_token=...&refresh_token=...&expires_in=3600',
      },
    },
  };

  app.addSchema({
    $id: 'AccessRefreshTokenRedirectResponse',
    ...AccessRefreshTokenRedirectResponseSchema,
  });

  app.addSchema({
    $id: 'VerifyTokenBody',
    ...VerifyTokenBodyJsonSchema,
  });

  app.addSchema({
    $id: 'ResendResponse',
    ...ResendResponseJsonSchema,
  });

  app.addSchema({
    $id: 'OTPResponse',
    ...OTPResponseJsonSchema,
  });

  app.addSchema({
    $id: 'LinkIdentityQuery',
    ...LinkIdentityQueryJsonSchema,
  });

  app.addSchema({
    $id: 'IdentityIdParams',
    ...IdentityIdParamsJsonSchema,
  });

  app.addSchema({
    $id: 'OAuthGrantResponse',
    ...OAuthGrantResponseJsonSchema,
  });

  app.addSchema({
    $id: 'OAuthGrantListResponse',
    ...OAuthGrantListResponseJsonSchema,
  });

  app.addSchema({
    $id: 'RevokeGrantQuery',
    ...RevokeGrantQueryJsonSchema,
  });

  // --- OAuth authorize redirect schema ---
  const OAuthAuthorizeRedirectResponseSchema = {
    type: 'object',
    description:
      "HTTP Redirect to the OAuth identity provider's authorization URL.",
    headers: {
      Location: {
        type: 'string',
        format: 'uri',
        description:
          'URL to which the user agent should redirect (or open in a browser for mobile apps).',
        example: 'https://accounts.google.com/o/oauth2/auth?...',
      },
    },
  };

  app.addSchema({
    $id: 'OAuthAuthorizeRedirectResponse',
    ...OAuthAuthorizeRedirectResponseSchema,
  });

  app.addSchema({
    $id: 'WebAuthnChallengeResponse',
    ...WebAuthnChallengeResponseJsonSchema,
  });

  const OAuthCallbackRedirectResponseSchema = {
    type: 'object',
    description:
      'HTTP Redirect to a URL containing the `error` and `error_description` query parameters which should be shown to the user requesting the OAuth sign-in flow.',
    headers: {
      Location: {
        type: 'string',
        format: 'uri',
        description:
          'URL containing the `error` and `error_description` query parameters.',
        example:
          'https://example.com/?error=server_error&error_description=User%20does%20not%20exist.',
      },
    },
  };

  app.addSchema({
    $id: 'OAuthCallbackRedirectResponse',
    ...OAuthCallbackRedirectResponseSchema,
  });

  // --- OAuth authorize redirect schema ---
  const OAuthRedirectToLoginResponseSchema = {
    type: 'object',
    description: 'Redirect to login or authorization page',
    headers: {
      Location: {
        type: 'string',
        format: 'uri',
      },
    },
  };

  app.addSchema({
    $id: 'OAuthRedirectToLoginResponse',
    ...OAuthRedirectToLoginResponseSchema,
  });

  app.addSchema({
    $id: 'SettingsResponse',
    ...SettingsResponseJsonSchema,
  });

  app.addSchema({
    $id: 'ErrorResponse',
    ...(ErrorResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'BadRequestResponse',
    description: 'HTTP Bad Request response.',
    $ref: 'ErrorResponse',
  });

  app.addSchema({
    $id: 'UnAuthorizedResponse',
    description: 'HTTP Unauthorized response.',
    $ref: 'ErrorResponse',
  });

  app.addSchema({
    $id: 'ForbiddenResponse',
    description: 'HTTP Forbidden response.',
    $ref: 'ErrorResponse',
  });

  app.addSchema({
    $id: 'InternalServerErrorResponse',
    description: 'HTTP Internal Server Error.',
    $ref: 'ErrorResponse',
  });

  app.addSchema({
    $id: 'RateLimitErrorResponse',
    ...(RateLimitErrorResponseJsonSchema as object),
  });

  app.addSchema({
    $id: 'RateLimitResponse',
    description: 'HTTP Too Many Requests.',
    $ref: 'RateLimitErrorResponse',
  });

  if (options.additionalSchemas) {
    for (const [name, schema] of Object.entries(options.additionalSchemas)) {
      app.addSchema({
        $id: name,
        ...(schema as object),
      });
    }
  }

  const swaggerOptions: SwaggerOptions = {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: options.title,
        version: options.version,
        description: options.description,
        termsOfService: options.termsOfService,
        contact: options.contact,
        license: options.license,
      },
      servers: options.servers,
      externalDocs: options.externalDocs,
      tags: options.tags,
    },
    refResolver: {
      buildLocalReference(json) {
        return json.$id as string;
      },
    },
  };

  await app.register(fastifySwagger, swaggerOptions);

  // Register @fastify/swagger-ui for serving Swagger UI
  await app.register(fastifySwaggerUi, {
    routePrefix,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
    },
    staticCSP: true,
  });
}
