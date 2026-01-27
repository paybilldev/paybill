import {FastifyInstance, FastifyPluginAsync} from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import {Environment} from '../services/environment';

declare module 'fastify' {
  interface FastifyInstance {
    environment: Environment;
  }
}

const fastifyEnvironment: FastifyPluginAsync = async (
  fastifyInstance: FastifyInstance,
) => {
  const environment = new Environment();

  fastifyInstance.decorate('environment', environment);

  fastifyInstance.log.info('Environments setup successfully.');
};

export default fastifyPlugin(fastifyEnvironment);
