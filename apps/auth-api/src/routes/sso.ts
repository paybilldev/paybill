import type {FastifyPluginAsync} from 'fastify';
import {SSOBody} from '../openapi/index.js';
import {initiateSSO} from '../services/sso.js';

const ssoRoutes: FastifyPluginAsync = async app => {
  app.post<{Body: SSOBody}>(
    '/sso',
    {
      schema: {
        summary: 'Initiate a Single-Sign On flow.',
        tags: ['sso'],
        operationId: 'SSOController_initiate',
        body: {
          $ref: 'SSOBody',
        },
        response: {
          200: {
            description:
              'Returned only when `skip_http_redirect` is `true` and the SSO provider could be identified from the `provider_id` or `domain`. Client libraries should use the returned URL to redirect or open a browser.',
            type: 'object',
            properties: {
              url: {
                type: 'string',
                format: 'uri',
                description: 'SSO redirect URL',
              },
            },
          },
          303: {
            description:
              'Redirect to the SSO provider using GET. Returned when skip_http_redirect is false or absent.',
            headers: {
              Location: {
                type: 'string',
                format: 'uri',
              },
            },
          },
          400: {
            $ref: 'BadRequestResponse',
          },
          404: {
            description:
              'Returned when the SSO provider could not be identified.',
            $ref: 'ErrorResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const result = await initiateSSO(request.body);

      if (request.body.skip_http_redirect) {
        return reply.send({url: result.url});
      }

      return reply.code(303).header('Location', result.url).send();
    },
  );
};

export default ssoRoutes;
