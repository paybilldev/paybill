import {Model} from '@paybilldev/sequelize';
import crypto from 'crypto';

export const PKCEInvalidCodeChallengeError =
  'code challenge does not match previously saved code verifier';
export const PKCEInvalidCodeMethodError = 'code challenge method not supported';

export class OAuthAuthorizationModel extends Model {
  isExpired(): boolean {
    const expiresAt = this.get('expires_at') as Date;
    return Date.now() > expiresAt.getTime();
  }

  /**
   * VerifyPKCE verifies the PKCE code verifier against the stored challenge
   */
  verifyPKCE(codeVerifier: string): boolean {
    const codeChallenge = this.get('code_challenge');
    if (!codeChallenge) {
      // No PKCE challenge stored, verification passes
      return true;
    }

    if (!codeVerifier) {
      throw new Error(
        'code_verifier is required when PKCE challenge is present',
      );
    }

    const codeChallengeMethod =
      (this.get('code_challenge_method') as string | null)?.toLowerCase() ||
      'plain';

    switch (codeChallengeMethod) {
      case 's256': {
        const hash = crypto.createHash('sha256').update(codeVerifier).digest();
        const encoded = hash
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        // Use timingSafeEqual only if lengths match
        if (Buffer.byteLength(encoded) !== Buffer.byteLength(codeChallenge)) {
          return false;
        }
        if (
          !crypto.timingSafeEqual(
            Buffer.from(encoded),
            Buffer.from(codeChallenge),
          )
        ) {
          return false;
        }
        break;
      }

      case 'plain': {
        // Ensure lengths match before using timingSafeEqual
        if (
          Buffer.byteLength(codeVerifier) !== Buffer.byteLength(codeChallenge)
        ) {
          return false;
        }
        if (
          !crypto.timingSafeEqual(
            Buffer.from(codeVerifier),
            Buffer.from(codeChallenge),
          )
        ) {
          return false;
        }
        break;
      }

      default:
        return false;
    }

    return true;
  }
}
