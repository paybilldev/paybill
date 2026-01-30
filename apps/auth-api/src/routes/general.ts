import type {FastifyPluginAsync} from 'fastify';
import {getSettings} from '../services/general.js';

const generalRoutes: FastifyPluginAsync = async app => {
  app.get(
    '/settings',
    {
      schema: {
        summary: 'Retrieve some of the public settings of the server.',
        description:
          'Use this endpoint to configure parts of any authentication UIs depending on the configured settings.',
        tags: ['general'],
        operationId: 'SettingsController_getSettings',
        response: {
          200: {
            $ref: 'SettingsResponse',
          },
        },
      },
    },
    async (_request, reply) => {
      const settings = await getSettings();
      return reply.send(settings);
    },
  );
};

export default generalRoutes;
