import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'mfa_challenges',
  title: 'MFA Challenges',
  comment: 'Auth: stores metadata about challenge requests made',
  model: 'MfaChallengeModel',
  createdBy: false,
  updatedBy: false,
  createdAt: true,
  updatedAt: false,
  logging: true,
  shared: false,
  fields: [
    {
      name: 'id',
      type: 'uuid',
      primaryKey: true,
      allowNull: false,
      interface: 'id',
      comment: 'Unique identifier for the MFA challenge',
      uiSchema: {
        type: 'string',
        title: 'Challenge ID',
        'x-component': 'Input',
        'x-read-pretty': true,
      },
    },
    {
      name: 'factor',
      type: 'belongsTo',
      foreignKey: 'factor_id',
      target: 'mfa_factors',
      targetKey: 'id',
      interface: 'm2o',
      comment:
        'Reference to the MFA factor used for this challenge (e.g., TOTP, SMS, WebAuthn)',
      uiSchema: {
        type: 'array',
        title: 'Factor ID',
        'x-component': 'AssociationField',
        'x-component-props': {
          multiple: false,
          fieldNames: {label: 'id', value: 'id'},
        },
      },
    },
    {
      name: 'verified_at',
      type: 'datetime',
      interface: 'datepicker',
      comment: 'Timestamp when the challenge was successfully verified',
      uiSchema: {
        type: 'datetime',
        title: 'Verified At',
        'x-component': 'DatePicker',
      },
    },
    {
      name: 'ip_address',
      type: 'string',
      allowNull: false,
      interface: 'input',
      comment: 'IP address from which the MFA challenge was attempted',
      uiSchema: {
        type: 'string',
        title: 'IP Address',
        'x-component': 'Input',
      },
    },
    {
      name: 'otp_code',
      type: 'string',
      interface: 'input',
      comment: 'One-time password code submitted for OTP-based challenges',
      uiSchema: {
        type: 'string',
        title: 'OTP Code',
        'x-component': 'Input',
      },
    },
    {
      name: 'web_authn_session_data',
      type: 'jsonb',
      comment:
        'Temporary WebAuthn session data used during hardware key authentication',
    },
  ],
});
