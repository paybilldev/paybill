import {Model} from '@paybilldev/sequelize';
import {FastifyInstance, FastifyPluginAsync} from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import {EventEmitter} from 'node:events';

declare module 'fastify' {
  interface FastifyInstance {
    emitter: EventEmitter;
  }
}

const fastifyEmitter: FastifyPluginAsync = async (
  fastifyInstance: FastifyInstance,
) => {
  const emitter = new EventEmitter();

  // 1. Decorate the instance so the emitter is accessible globally
  fastifyInstance.decorate('emitter', emitter);

  emitter.on('cache:del:auth', async ({userId}) => {
    await fastifyInstance.cache.del(`auth:${userId}`);
  });

  // 3. Clean up listeners on server close to prevent memory leaks
  fastifyInstance.addHook('onClose', (instance, done) => {
    emitter.removeAllListeners();
    done();
  });
};

export default fastifyPlugin(fastifyEmitter);
