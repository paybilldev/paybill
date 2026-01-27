import {Cache, CacheManager, CacheManagerOptions} from '@paybilldev/cache';
import {FastifyInstance, FastifyPluginAsync} from 'fastify';
import fastifyPlugin from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    cache: Cache;
    cacheManager: CacheManager;
  }
}

const defaultOpts: Partial<CacheManagerOptions> = {
  defaultStore: process.env.CACHE_DEFAULT_STORE || 'memory',
  stores: {
    memory: {
      store: 'memory',
      max: process.env.CACHE_MEMORY_MAX
        ? Number(process.env.CACHE_MEMORY_MAX)
        : 2000,
    },
    ...(process.env.REDIS_URL || process.env.CACHE_REDIS_URL
      ? {
          redis: {
            url: process.env.REDIS_URL || process.env.CACHE_REDIS_URL,
          },
        }
      : {}),
  },
};

const fastifyCacheManager: FastifyPluginAsync<CacheManagerOptions> = async (
  fastifyInstance: FastifyInstance,
  options: CacheManagerOptions,
) => {
  const opts = {...defaultOpts, ...options};
  const cacheManager = new CacheManager(opts);
  const defaultCache = await cacheManager.createCache({name: 'main'});

  fastifyInstance.decorate('cache', defaultCache);
  fastifyInstance.decorate('cacheManager', cacheManager);

  fastifyInstance.addHook('onClose', async () => {
    try {
      await fastifyInstance.cacheManager.close();
      fastifyInstance.log.info('Cache connection closed.');
    } catch (error) {
      fastifyInstance.log.error('Error closing cache connection');
    }
  });
};

const plugin: FastifyPluginAsync<CacheManagerOptions> =
  fastifyPlugin(fastifyCacheManager);

export default plugin;
