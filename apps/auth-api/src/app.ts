import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import paybillRoutes from './routes/index.js';
import {registerOpenAPI} from './openapi/plugin.js';
import rateLimit from '@fastify/rate-limit';
import {fastifySequelize, fastifyJwt} from './plugins/index.js';
import {Dialect} from '@paybilldev/sequelize';
import {errorHandler} from './plugins/error-handler.js';
import paybillCache from './plugins/cache-manager.js';
import {jwtConfig} from './plugins/jwt.js';

export async function buildApp() {
  const server = Fastify({logger: true});

  server.register(rateLimit); // global plugin registration
  server.register(fastifyJwt, jwtConfig);

  server.register(fastifySequelize, {
    dialect: process.env.DB_DRIVER
      ? (process.env.DB_DRIVER as Dialect)
      : 'sqlite',
    host: process.env.DB_HOST ? process.env.DB_HOST : 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await registerOpenAPI(server, {
    title: 'Paybill Auth REST API',
    version: 'latest',
    description: `This is the REST API for Paybill Auth.

Notes:
- 5XX errors are global
- 400/422 are inconsistent
- CAPTCHA token may be required
- OAuth Client and OAuth Server modes supported`,
    termsOfService: 'https://paybill.dev/legal/terms',
    contact: {
      name: 'Ask a question about this API',
      url: 'https://github.com/paybilldev/paybill/discussions',
    },
    license: {
      name: 'BSL License',
      url: 'https://github.com/paybilldev/paybill/blob/master/LICENSE',
    },
    externalDocs: {
      description: 'Learn more about Paybill Auth',
      url: 'https://paybill.dev/docs/guides/auth/overview',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT ?? '5000'}`,
        description: 'Local development server',
      },
      {
        url: 'https://{project}.paybill.dev/auth/v1',
        description: 'Paybill project Auth endpoint',
        variables: {
          project: {
            description: 'Your Paybill project ID',
            default: 'abcdefghijklmnopqrst',
          },
        },
      },
    ],
    tags: [
      {name: 'auth', description: 'APIs for authentication and authorization.'},
      {
        name: 'oauth-client',
        description:
          'APIs for OAuth flows where this service acts as an OAuth client (connecting to external providers).',
      },
      {
        name: 'oauth-server',
        description:
          'APIs for OAuth 2.1 flows where this service acts as an OAuth provider/server for other applications. Requires `OAUTH_SERVER_ENABLED=true` for self-hosted or enable in Dashboard. (Experimental.)',
      },
      {
        name: 'user',
        description: 'APIs used by a user to manage their account.',
      },
      {name: 'status', description: 'System Status APIs'},
      {
        name: 'sso',
        description: 'APIs for authenticating using SSO providers (SAML).',
      },
      {
        name: 'admin',
        description: 'Administration APIs requiring elevated access.',
      },
      {
        name: 'saml',
        description: 'SAML 2.0 Endpoints.',
      },
    ],
  });

  server.setErrorHandler(errorHandler);

  await server.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: [
      'Accept',
      'Authorization',
      'Content-Type',
      'X-Client-IP',
      'X-Client-Info',
      'X-JWT-AUD',
      'x-use-cookie',
      'X-Paybill-Api-Version',
    ],
    exposedHeaders: ['X-Total-Count', 'Link', 'X-Paybill-Api-Version'],
  });
  await server.register(paybillRoutes, {prefix: process.env.URL_PREFIX || '/'});

  await server.register(paybillCache);

  return server;
}
