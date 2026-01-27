import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'mfa_amr_claims',
  title: 'MFA AMR Claims',
  comment:
    'Auth: Stores authenticator method reference claims for multi factor authentication',
  model: 'MfaAmrClaimModel',
  createdBy: false,
  updatedBy: false,
  createdAt: true,
  updatedAt: true,
  logging: true,
  shared: false,
  indexes: [
    {
      unique: true,
      fields: ['session_id', 'authentication_method'],
    },
  ],
  fields: [
    {
      name: 'id',
      type: 'uuid',
      primaryKey: true,
      allowNull: false,
      interface: 'id',
      comment: 'Unique identifier for the AMR claim record',
      uiSchema: {
        type: 'string',
        title: 'Claim ID',
        'x-component': 'Input',
        'x-read-pretty': true,
      },
    },
    {
      name: 'session',
      type: 'belongsTo',
      foreignKey: 'session_id',
      target: 'sessions',
      targetKey: 'id',
      interface: 'm2o',
      comment: 'Authentication session ID this AMR claim belongs to',
      uiSchema: {
        type: 'array',
        title: 'Session ID',
        'x-component': 'AssociationField',
        'x-component-props': {
          multiple: false,
          fieldNames: {label: 'id', value: 'id'},
        },
      },
    },
    {
      name: 'authentication_method',
      type: 'string',
      allowNull: false,
      interface: 'input',
      comment:
        'Authenticator method reference (e.g., pwd, otp, sms, totp, webauthn)',
      uiSchema: {
        type: 'string',
        title: 'Authentication Method',
        'x-component': 'Input',
      },
    },
  ],
});
