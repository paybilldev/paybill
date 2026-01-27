import {Model} from '@paybilldev/sequelize';

export class MfaAmrClaimModel extends Model {
  IsAAL2Claim(): boolean {
    const method = this.get('authentication_method');

    return (
      method === 'totp' || method === 'mfa/phone' || method === 'mfa/webauthn'
    );
  }
}
