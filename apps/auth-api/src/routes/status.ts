import type {FastifyPluginAsync} from 'fastify';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json dynamically
const packageJsonPath = join(__dirname, '../../package.json');

async function getPackageInfo() {
  const data = await readFile(packageJsonPath, 'utf-8');
  const pkg = JSON.parse(data);
  return {
    name: pkg.name,
    version: pkg.version,
  };
}

const statusRoutes: FastifyPluginAsync = async app => {
  app.get(
    '/health',
    {
      schema: {
        summary: 'Service healthcheck.',
        description:
          'Ping this endpoint to receive information about the health of the service.',
        tags: ['status'],
        operationId: 'StatusController_getStatus',
        response: {
          200: {
            description: 'Service is healthy.',
            type: 'object',
            properties: {
              version: {
                type: 'string',
                description: 'The version of the service.',
              },
              name: {type: 'string', description: 'The name of the service.'},
            },
          },
          500: {
            description:
              'Service is not healthy. Retriable with exponential backoff.',
          },
          502: {
            description:
              'Service is not healthy: infrastructure issue. Usually not retriable.',
          },
          503: {
            description:
              'Service is not healthy: infrastructure issue. Retriable with exponential backoff.',
          },
          504: {
            description:
              'Service is not healthy: request timed out. Retriable with exponential backoff.',
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        const {name, version} = await getPackageInfo();
        return reply.status(200).send({name, version});
      } catch (err) {
        return reply.status(500);
      }
    },
  );
};

export default statusRoutes;
