import {Model} from '@paybilldev/sequelize';

export class UserModel extends Model {
  IsPhoneConfirmed(): boolean {
    return this.get('phone_confirmed_at') != null;
  }

  IsConfirmed(): boolean {
    return this.get('email_confirmed_at') != null;
  }

  IsBanned(): boolean {
    if (!this.get('banned_until')) {
      return false;
    }
    return Date.now() < (this.get('banned_until') as Date).getTime();
  }

  desensitize() {
    const {fields} = (this.constructor as typeof UserModel).collection;
    const result = (this.constructor as typeof UserModel).build(
      {},
      {isNewRecord: this.isNewRecord},
    );
    for (const [name, value] of Object.entries(this.get())) {
      const field = fields.get(name);
      if (field && !field.options.hidden) {
        result.set(name, value);
      }
    }
    return result;
  }
}
