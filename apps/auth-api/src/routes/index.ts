import type {FastifyPluginAsync} from 'fastify';

import statusRoutes from './status.js';
import oauthRoutes from './oauth.js';
import adminRoutes from './admin.js';
import authRoutes from './auth.js';
import oauthClientRoutes from './oauth-client.js';
import userRoutes from './user.js';
import generalRoutes from './general.js';
import ssoRoutes from './sso.js';
import samlRoutes from './saml.js';

const paybillRoutes: FastifyPluginAsync = async app => {
  app.register(statusRoutes, {prefix: '/'});
  app.register(authRoutes, {prefix: '/'});
  app.register(oauthClientRoutes, {prefix: '/'});
  app.register(oauthRoutes, {prefix: '/oauth'});
  app.register(userRoutes, {prefix: '/'});
  app.register(adminRoutes, {prefix: '/'});
  app.register(generalRoutes, {prefix: '/'});
  app.register(ssoRoutes, {prefix: '/'});
  app.register(samlRoutes, {prefix: '/'});
};

export default paybillRoutes;
