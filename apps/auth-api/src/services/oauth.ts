import {FastifyRequest} from 'fastify';
import {
  CompactEncrypt,
  compactDecrypt,
  decodeProtectedHeader,
  importJWK,
  jwtVerify,
} from 'jose';
import {createHash, createHmac, randomBytes} from 'crypto';
import {SignJWT as JoseSignJWT, JWTPayload} from 'jose';
import {Algorithm, JwtPayload} from 'jsonwebtoken';
import {Jwk, JwkInfo, JWTConfiguration} from '../plugins/jwt.js';

/* ---------- GrantParams ---------- */
export interface GrantParams {
  factor_id?: string;
  session_not_after?: Date;
  session_tag?: string;
  oauth_client_id?: string;
  scopes?: string;
  user_agent: string;
  ip: string;
}

export class GrantParams implements GrantParams {
  factor_id?: string;
  session_not_after?: Date;
  session_tag?: string;
  oauth_client_id?: string;
  scopes?: string;
  user_agent: string = '';
  ip: string = '';

  fillGrantParams(request: FastifyRequest) {
    this.user_agent = request.headers['user-agent'] || '';
    this.ip =
      (request.ip as string) ||
      (request.headers['x-forwarded-for'] as string) ||
      '';
  }
}

/* ---------- JWT Claims ---------- */
export interface AccessTokenClaims extends JwtPayload {
  email: string;
  phone: string;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
  role: string;
  aal?: string;
  amr?: Array<{method: string; timestamp: number; provider?: string}>;
  session_id?: string;
  is_anonymous: boolean;
  client_id?: string;
  scope?: string;
}

export enum Scope {
  OpenID = 'openid',
  Email = 'email',
  Profile = 'profile',
  Phone = 'phone',
}

export function parseScopeString(scopeString: string): string[] {
  if (!scopeString) return [];
  return scopeString
    .split(' ')
    .map(s => s.trim())
    .filter(Boolean);
}

export function hasScope(scopeList: string[], scope: Scope): boolean {
  return scopeList.includes(scope);
}

export function hasScopeInRequest(
  request: FastifyRequest,
  scope: Scope,
): boolean {
  if (!request.jwtClaims?.scope) return false;
  const scopes = request.jwtClaims.scope.split(' ');
  return scopes.includes(scope);
}

export interface IDTokenClaims extends JwtPayload {
  sub: string;
  aud: string;
  iss: string;
  iat: number;
  exp: number;
  auth_time: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
  name?: string;
  picture?: string;
  updated_at?: number;
  preferred_username?: string;
  client_id?: string;
}

/* ---------- HMAC / Key Encryption ---------- */
export function generateHmacKey(): Buffer {
  return randomBytes(32);
}

export async function encryptKey(hmacKey: Buffer): Promise<string> {
  if (!process.env.DB_ENCRYPT || !process.env.DB_ENCRYPTION_KEY)
    return hmacKey.toString('base64url');

  const jweKey = await importJWK(
    {
      kty: 'oct',
      k: process.env.DB_ENCRYPTION_KEY,
      alg: 'A256GCM',
      ext: true,
    },
    'A256GCM',
  );

  const encrypted = await new CompactEncrypt(hmacKey)
    .setProtectedHeader({
      alg: 'dir',
      enc: 'A256GCM',
      kid: process.env.DB_ENCRYPTION_KEY_ID,
    })
    .encrypt(jweKey);

  return encrypted;
}

export async function decryptKey(storedKey: string): Promise<Buffer> {
  if (!process.env.DB_ENCRYPT) return Buffer.from(storedKey, 'base64url');

  const jweKey = await importJWK(
    {
      kty: 'oct',
      k: process.env.DB_ENCRYPTION_KEY,
      alg: 'A256GCM',
      ext: true,
    },
    'A256GCM',
  );

  const {plaintext} = await compactDecrypt(storedKey, jweKey);
  return Buffer.from(plaintext);
}

/* ---------- JWK / Signing ---------- */
export function getSigningJwk(
  config: JWTConfiguration,
  purpose: 'access' | 'id_token' = 'access',
): JwkInfo {
  // Prefer keyID if set and valid
  if (config.keyID && config.keys[config.keyID]) {
    const candidate = config.keys[config.keyID]!;
    if (
      candidate.privateKey?.key_ops?.includes('sign') &&
      (purpose === 'access' || isAsymmetricKey(candidate.privateKey))
    ) {
      return candidate;
    }
  }

  // Fallback: find first suitable key
  for (const k of Object.values(config.keys)) {
    if (!k.privateKey?.key_ops?.includes('sign')) continue;
    if (purpose === 'id_token' && !isAsymmetricKey(k.privateKey)) continue;
    return k;
  }

  throw new Error(
    purpose === 'id_token'
      ? 'No asymmetric signing key available for ID token (required by OIDC)'
      : 'No signing key found',
  );
}

function isAsymmetricKey(jwk: Jwk): boolean {
  return jwk.kty !== 'oct';
}

export function getSigningAlg(jwk: {alg?: string}): Algorithm {
  switch (jwk.alg) {
    case 'RS256':
    case 'RS384':
    case 'RS512':
    case 'ES256':
    case 'ES384':
    case 'ES512':
    case 'PS256':
    case 'PS384':
    case 'PS512':
    case 'HS256':
    case 'HS384':
    case 'HS512':
      return jwk.alg;
    default:
      return 'HS256';
  }
}

/**
 * Import JWK for jose signing
 */
async function getJoseKey(jwk: Jwk) {
  if (jwk.kty === 'oct' && jwk.k) {
    return importJWK({kty: 'oct', k: jwk.k, alg: jwk.alg}, jwk.alg);
  }

  if (jwk.kty === 'EC' && jwk.d) {
    // Ensure private key has only "sign"
    const privateJwk = {...jwk, key_ops: ['sign']};
    return importJWK(privateJwk, jwk.alg);
  }

  throw new Error('Unsupported signing key');
}

/**
 * Sign JWT (access or ID token)
 */
export async function SignJWT(
  config: JWTConfiguration,
  claims: JWTPayload,
  purpose: 'access' | 'id_token' = 'access',
): Promise<string> {
  const jwkInfo = getSigningJwk(config, purpose);
  const jwk = jwkInfo.privateKey;
  const alg = getSigningAlg(jwk);
  const key = await getJoseKey(jwk);

  return new JoseSignJWT(claims)
    .setProtectedHeader({
      alg,
      kid: jwk.kid,
      typ: 'JWT',
    })
    .setIssuer(config.issuer)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + config.exp)
    .sign(key);
}

/* ---------- Refresh Token Generation ---------- */
export async function generateRefreshToken(
  session: any,
  hmacKey: Buffer,
): Promise<string> {
  const version = Buffer.from([0]);
  const sessionIdBytes = Buffer.from(session.id.replace(/-/g, ''), 'hex');
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(session.refresh_token_counter));

  const payload = Buffer.concat([version, sessionIdBytes, counterBytes]);

  // Signature covers Version + Session + Counter
  const signature = createHmac('sha256', hmacKey)
    .update(payload)
    .digest()
    .slice(0, 16);

  // Checksum covers Version + Session + Counter + Signature
  const checksum = createHmac('sha256', Buffer.alloc(0))
    .update(Buffer.concat([payload, signature]))
    .digest()
    .slice(0, 4);

  return Buffer.concat([payload, signature, checksum]).toString('base64url');
}

export function hashSecret(secret: string): string {
  const hash = createHash('sha256').update(secret).digest();
  return Buffer.from(hash).toString('base64url');
}

export function generateClientSecret(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Verifies JWT using same logic as Go implementation:
 * - Prefers kid-matched public key from config
 * - Falls back to HS256 with secret when kid missing and alg=HS256
 * - Validates against configured algorithms only
 */
export async function verifyJWT(
  token: string,
  config: JWTConfiguration,
): Promise<JWTPayload> {
  try {
    const header = decodeProtectedHeader(token);
    const {kid, alg} = header;

    let key: any;
    if (kid && config.keys[kid]) {
      const jwkInfo = config.keys[kid];
      // Prefer public key for verification; fallback to private key for symmetric keys
      const jwk = jwkInfo.publicKey || jwkInfo.privateKey;
      key = await importJWK(jwk, alg as string);
    } else if (alg === 'HS256') {
      // Fallback to symmetric verification (matches Go behavior)
      key = new TextEncoder().encode(config.secret);
    } else {
      throw new Error(`Unrecognized JWT kid '${kid}' for algorithm '${alg}'`);
    }

    const {payload} = await jwtVerify(token, key, {
      algorithms: config.validMethods,
    });

    return payload;
  } catch (err: any) {
    throw new Error(`invalid JWT: ${err.message || 'verification failed'}`);
  }
}

export const SupportedOAuthScopes = Object.values(Scope);

export function IsSupportedScope(scope: string): boolean {
  return (SupportedOAuthScopes as string[]).includes(scope);
}
