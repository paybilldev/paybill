import {Model} from '@paybilldev/sequelize';

export class OAuthClientModel extends Model {
  isPublic(): boolean {
    return this.get('client_type') == 'public';
  }

  isConfidential(): boolean {
    return this.get('client_type') == 'confidential';
  }
}
