import {Model} from '@paybilldev/sequelize';
import {parseScopeString} from '../services';

export class OAuthConsentModel extends Model {
  coversScopes(requestedScopes: string): boolean {
    if (this.IsRevoked()) {
      return false;
    }

    return this.hasAllScopes(parseScopeString(requestedScopes));
  }

  IsRevoked(): boolean {
    return this.get('revoked_at') != null;
  }

  hasAllScopes(requestedScopes: string[]): boolean {
    const grantedSet: Record<string, boolean> = {};

    for (const scope of this.getScopeList()) {
      grantedSet[scope] = true;
    }

    for (const requestedScope of requestedScopes) {
      if (!grantedSet[requestedScope]) {
        return false;
      }
    }

    return true;
  }

  getScopeList(): string[] {
    return parseScopeString(this.get('scopes'));
  }
}
