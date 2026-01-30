import {FastifyRequest, FastifyReply} from 'fastify';
import {AccessTokenClaims, verifyJWT} from '../services';

declare module 'fastify' {
  interface FastifyRequest {
    jwtClaims?: AccessTokenClaims;
    user?: any; // Replace with actual User model type when available
    session?: any; // Replace with actual Session model type when available
  }
}
export async function requireAuthentication(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // 1️⃣ Extract Bearer token
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      code: 401,
      msg: 'This endpoint requires a valid Bearer token',
    });
  }
  const token = authHeader.substring(7).trim();

  // 2️⃣ Verify and decode JWT
  let claims: AccessTokenClaims;
  try {
    claims = (await verifyJWT(
      token,
      request.server.jwtConfig,
    )) as AccessTokenClaims;
  } catch (err) {
    request.log.warn(
      {err: err instanceof Error ? err.message : err},
      'JWT verification failed',
    );
    return reply.status(403).send({
      code: 403,
      msg: 'invalid JWT: unable to parse or verify signature',
    });
  }

  // 3️⃣ Validate critical claims
  if (!claims.sub) {
    return reply.status(403).send({
      code: 403,
      msg: 'invalid token: missing sub claim',
    });
  }

  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(claims.sub)) {
    return reply.status(400).send({
      code: 400,
      msg: 'invalid claim: sub claim must be a UUID',
    });
  }

  // 4️⃣ Load user
  const UserModel = request.server.sequelize.getCollection('users').model;
  const user = await UserModel.findByPk(claims.sub);
  if (!user) {
    return reply.status(403).send({
      code: 403,
      msg: 'User from sub claim in JWT does not exist',
    });
  }
  request.user = user;

  // 5️⃣ Load session if present (skip nil UUID)
  const NIL_UUID = '00000000-0000-0000-0000-000000000000';
  if (claims.session_id && claims.session_id !== NIL_UUID) {
    if (!UUID_REGEX.test(claims.session_id)) {
      return reply.status(400).send({
        code: 400,
        msg: 'invalid claim: session_id claim must be a UUID',
      });
    }

    const SessionModel =
      request.server.sequelize.getCollection('sessions').model;
    const session = await SessionModel.findByPk(claims.session_id, {
      include: [{model: UserModel, as: 'user'}],
    });

    if (!session) {
      return reply.status(403).send({
        code: 403,
        msg: 'Session from session_id claim in JWT does not exist',
      });
    }
    request.session = session;
  }

  // 6️⃣ Attach verified claims to request
  request.jwtClaims = claims;
}

export async function requireNotAnonymous(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (request.jwtClaims?.is_anonymous) {
    return reply.status(403).send({
      code: 403,
      msg: 'Anonymous user not allowed to perform these actions',
    });
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const adminRoles = request.server.jwtConfig.adminRoles || [];
  const userRole = request.jwtClaims?.role;

  if (!userRole || !adminRoles.includes(userRole)) {
    return reply.status(403).send({
      code: 403,
      msg: `User not allowed. Token requires one of these roles: ${adminRoles.join(', ')}`,
    });
  }
}
