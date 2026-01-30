import {FastifyInstance, FastifyPluginAsync} from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import crypto from 'crypto';

declare module 'fastify' {
  interface FastifyInstance {
    jwtConfig: JWTConfiguration;
  }
}

export type JwkKeyType = 'oct' | 'RSA' | 'EC' | 'OKP';

export interface Jwk {
  kty: JwkKeyType;
  kid?: string;
  alg?: string;
  use?: 'sig';
  key_ops?: Array<'sign' | 'verify'>;

  // symmetric (HS*)
  k?: string; // base64url

  // RSA
  n?: string;
  e?: string;
  d?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;

  // EC
  crv?: string;
  x?: string;
  y?: string;
}

export interface JwkInfo {
  publicKey: Jwk | null;
  privateKey: Jwk;
}

export type JwtKeysDecoder = Record<string, JwkInfo>;

export interface JWTConfiguration {
  secret: string;
  exp: number;
  aud: string;
  adminGroupName: string;
  adminRoles: string[];
  defaultGroupName: string;
  issuer: string;
  keyID: string;
  keys: JwtKeysDecoder;
  validMethods: string[];
}

/* ---------- Helpers ---------- */

function base64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function deriveHS256Key(secret: string): JwtKeysDecoder {
  const kid = crypto.createHash('sha1').update(secret).digest('hex');

  const jwk: Jwk = {
    kty: 'oct',
    kid,
    alg: 'HS256',
    use: 'sig',
    key_ops: ['sign', 'verify'],
    k: base64url(Buffer.from(secret)),
  };

  return {
    [kid]: {
      privateKey: jwk,
      publicKey: null,
    },
  };
}

function parseJwkKeys(raw?: string): JwtKeysDecoder | null {
  if (!raw) return null;

  const arr: Jwk[] = JSON.parse(raw);
  return Object.fromEntries(
    arr.map(jwk => {
      const kid = jwk.kid!;
      const isSymmetric = jwk.kty === 'oct';

      return [
        kid,
        {
          privateKey: {
            ...jwk,
            use: 'sig',
            key_ops: jwk.key_ops ?? ['sign', 'verify'],
          },
          publicKey: isSymmetric
            ? null
            : {
                ...jwk,
                d: undefined,
                p: undefined,
                q: undefined,
                dp: undefined,
                dq: undefined,
                qi: undefined,
                key_ops: ['verify'],
                use: 'sig',
              },
        },
      ];
    }),
  );
}

/* ---------- applyDefaultsJWT (Go equivalent) ---------- */

export function applyDefaultsJWT(
  partial: Partial<JWTConfiguration>,
): JWTConfiguration {
  const secret = partial.secret ?? process.env.JWT_SECRET ?? '';
  const parsedKeys = parseJwkKeys(process.env.JWT_KEYS);
  const keys = parsedKeys ?? deriveHS256Key(secret);

  const firstKid = Object.keys(keys)[0]!;

  return {
    secret,
    exp: partial.exp ?? Number(process.env.JWT_EXP ?? 3600),
    aud: partial.aud ?? process.env.JWT_AUD ?? 'authenticated',
    issuer:
      partial.issuer ?? process.env.JWT_ISSUER ?? process.env.URL_PREFIX ?? '',
    adminGroupName:
      partial.adminGroupName ?? process.env.JWT_ADMIN_GROUP_NAME ?? 'admin',
    defaultGroupName:
      partial.defaultGroupName ??
      process.env.JWT_DEFAULT_GROUP_NAME ??
      'authenticated',
    adminRoles:
      partial.adminRoles ??
      (process.env.JWT_ADMIN_ROLES
        ? process.env.JWT_ADMIN_ROLES.split(',')
        : []),
    keyID: partial.keyID || process.env.JWT_KEY_ID || firstKid,
    keys,
    validMethods:
      partial.validMethods ??
      Object.values(keys).map(k => k.privateKey.alg || 'HS256'),
  };
}

/* ---------- Final Config ---------- */

export const jwtConfig: JWTConfiguration = applyDefaultsJWT({});

/* ---------- Fastify Plugin ---------- */

const fastifyJwt: FastifyPluginAsync<JWTConfiguration> = async (
  fastifyInstance: FastifyInstance,
  options: JWTConfiguration,
) => {
  const config = options ?? jwtConfig;
  fastifyInstance.decorate('jwtConfig', config);
  fastifyInstance.log.info('JWT configuration loaded.');
};

export default fastifyPlugin(fastifyJwt);
