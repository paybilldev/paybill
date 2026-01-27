import {Model} from '@paybilldev/sequelize';
import {UserModel} from './UserModel';
import {MfaAmrClaimModel} from './MfaAmrClaimModel';

type AMREntry = {
  method: string;
  timestamp: number;
  provider?: string;
};

export class SessionModel extends Model {
  /**
   * Calculate AAL and AMR entries from loaded AMR claims
   */
  CalculateAALAndAMR(user: UserModel) {
    let aal: 'aal1' | 'aal2' | 'aal3' = 'aal1';
    const amr: AMREntry[] = [];

    for (const claim of (this.get('amr_claims') || []) as MfaAmrClaimModel[]) {
      if (claim.IsAAL2Claim()) {
        aal = 'aal2';
      }

      const entry: AMREntry = {
        method: claim.get('authentication_method'),
        timestamp: Math.floor(
          new Date(claim.get('updated_at')).getTime() / 1000,
        ),
      };

      // SSO provider enrichment (mirrors Go logic)
      if (entry.method === 'sso/saml' && user?.identities?.length === 1) {
        const identity = user.identities[0];
        if (identity.provider?.startsWith('sso:')) {
          entry.provider = identity.provider.replace('sso:', '');
        }
      }

      amr.push(entry);
    }

    // Sort most recent first
    amr.sort((a, b) => b.timestamp - a.timestamp);

    return {aal, amr};
  }
}
