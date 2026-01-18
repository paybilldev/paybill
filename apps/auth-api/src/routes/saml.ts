import type {FastifyPluginAsync} from 'fastify';
import {getSamlMetadata, handleSamlAcs} from '../services/index.js';

const samlRoutes: FastifyPluginAsync = async app => {
  // GET /saml/metadata
  app.get<{Querystring: {download?: boolean}}>(
    '/saml/metadata',
    {
      schema: {
        summary: 'Returns the SAML 2.0 Metadata XML.',
        description:
          'The metadata XML can be downloaded or used for the SAML 2.0 Metadata URL discovery mechanism. This URL is the SAML 2.0 EntityID of the Service Provider implemented by this server.',
        tags: ['saml'],
        operationId: 'SamlController_getMetadata',
        querystring: {
          type: 'object',
          properties: {
            download: {
              type: 'boolean',
              description:
                'If set to true will add a Content-Disposition header to trigger a browser download.',
            },
          },
        },
        response: {
          200: {
            description: 'A valid SAML 2.0 Metadata XML document.',
            type: 'string',
            headers: {
              'Content-Disposition': {
                type: 'string',
                description:
                  'Present if download=true, triggers browser download dialog.',
                example: 'attachment; filename="metadata.xml"',
              },
              'Cache-Control': {
                type: 'string',
                description:
                  'Should be parsed and obeyed to avoid putting strain on the server.',
                example: 'public, max-age=600',
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {xml, cacheControl} = await getSamlMetadata();

      reply.header('Cache-Control', cacheControl);

      if (request.query.download) {
        reply.header(
          'Content-Disposition',
          'attachment; filename="metadata.xml"',
        );
      }

      return reply.type('application/xml').send(xml);
    },
  );

  // POST /saml/acs
  app.post<{
    Querystring: {
      RelayState?: string;
      SAMLArt?: string;
      SAMLResponse?: string;
    };
  }>(
    '/saml/acs',
    {
      schema: {
        summary: 'SAML 2.0 Assertion Consumer Service (ACS) endpoint.',
        description:
          'Implements the SAML 2.0 Assertion Consumer Service (ACS) endpoint supporting the POST and Artifact bindings.',
        tags: ['saml'],
        operationId: 'SamlController_acs',
        security: [],
        querystring: {
          type: 'object',
          properties: {
            RelayState: {
              oneOf: [
                {type: 'string', format: 'uri'},
                {type: 'string', format: 'uuid'},
              ],
            },
            SAMLArt: {
              type: 'string',
              description:
                'Artifact binding. Cannot be used without a UUID RelayState.',
            },
            SAMLResponse: {
              type: 'string',
              description:
                'POST binding. Must be present unless SAMLArt is specified.',
            },
          },
        },
        response: {
          302: {
            $ref: 'AccessRefreshTokenRedirectResponse',
          },
          400: {
            $ref: 'BadRequestResponse',
          },
          429: {
            $ref: 'RateLimitResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const redirectUrl = await handleSamlAcs(request.query);

      return reply.code(302).header('Location', redirectUrl).send();
    },
  );
};

export default samlRoutes;
