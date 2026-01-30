import Sequelize, {Model, Options} from '@paybilldev/sequelize';
import {FastifyInstance, FastifyPluginAsync} from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import * as glob from 'glob';
import path, {basename} from 'path';
import {fileURLToPath} from 'url';
import {importModule} from '../utils';
import {UserModel} from '../model/UserModel';
import {OAuthClientModel} from '../model/OAuthClientModel';
import {OAuthAuthorizationModel} from '../model/OAuthAuthorizationModel';
import {AuditLogEntryModel} from '../model/AuditLogEntryModel';
import {SessionModel} from '../model/SessionModel';
import {MfaAmrClaimModel} from '../model/MfaAmrClaimModel';
import {OAuthConsentModel} from '../model/OAuthConsentModel';

declare module 'fastify' {
  interface FastifyInstance {
    sequelize: Sequelize;
  }
}

const defaultOpts: Partial<Options> = {
  define: {
    underscored: true,
    timestamps: true,
  },
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastifySequelize: FastifyPluginAsync<Options> = async (
  fastifyInstance: FastifyInstance,
  options: Options,
) => {
  const opts = {...defaultOpts, ...options};
  const sequelize = new Sequelize(opts);

  await sequelize.auth();
  await sequelize.checkVersion();

  fastifyInstance.decorate('sequelize', sequelize);
  fastifyInstance.log.info('Database connected successfully.');

  sequelize.on('users.afterSave', async (user: Model) => {
    const id = user.get('id');
    await fastifyInstance.cache.set(`auth:${id}`, user.toJSON());
  });

  sequelize.on('users.afterDestroy', async (user: Model) => {
    const id = user.get('id');
    await fastifyInstance.cache.del(`auth:${id}`);
  });

  sequelize.registerModels({
    UserModel,
    OAuthClientModel,
    OAuthAuthorizationModel,
    AuditLogEntryModel,
    SessionModel,
    MfaAmrClaimModel,
    OAuthConsentModel,
  });

  fastifyInstance.log.debug('load plugin collections');

  const collectionsDir = path.resolve(__dirname, '../collections');

  await sequelize.import({
    directory: collectionsDir,
    from: 'auth',
  });

  fastifyInstance.log.debug('load plugin migrations');

  type MigrationStage = 'beforeLoad' | 'afterSync' | 'afterLoad';

  const migrations: Record<MigrationStage, any[]> = {
    beforeLoad: [],
    afterSync: [],
    afterLoad: [],
  };

  const extensions = ['js', 'ts'];
  const pattern = `${path.resolve(__dirname, '../migrations')}/*.{${extensions.join(',')}}`;

  const files = glob.sync(pattern, {
    ignore: ['**/*.d.ts'],
  });

  for (const file of files) {
    const MigrationClass = await importModule(file);
    let filename = basename(file);
    filename = filename.substring(0, filename.lastIndexOf('.')) || filename;

    const m = new MigrationClass({sequelize});
    m.name = `${filename}/auth`;

    const stage = (m.on || 'afterLoad') as MigrationStage;
    migrations[stage].push(m);
  }

  const migrator = {
    beforeLoad: {
      up: async () => {
        fastifyInstance.log.debug('run core migrations (beforeLoad)');
        const m = sequelize.createMigrator({migrations: migrations.beforeLoad});
        await m.up();
      },
    },
    afterSync: {
      up: async () => {
        fastifyInstance.log.debug('run core migrations (afterSync)');
        const m = sequelize.createMigrator({migrations: migrations.afterSync});
        await m.up();
      },
    },
    afterLoad: {
      up: async () => {
        fastifyInstance.log.debug('run core migrations (afterLoad)');
        const m = sequelize.createMigrator({migrations: migrations.afterLoad});
        await m.up();
      },
    },
  };
  await sequelize.prepare();
  await migrator.beforeLoad.up();
  await sequelize.sync();
  await migrator.afterSync.up();
  await migrator.afterLoad.up();

  fastifyInstance.addHook('onClose', async () => {
    try {
      await sequelize.close();
      fastifyInstance.log.info('Database connection closed.');
    } catch (error) {
      fastifyInstance.log.error('Error closing database connection');
    }
  });
};

export default fastifyPlugin(fastifySequelize);
