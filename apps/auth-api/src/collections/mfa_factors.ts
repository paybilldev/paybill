import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'mfa_factors',
  title: 'MFA Factors',
  comment: 'Auth: stores metadata about factors',
  model: 'MfaFactorModel',
  createdBy: false,
  updatedBy: false,
  createdAt: true,
  updatedAt: true,
  logging: true,
  shared: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'phone'],
    },
  ],
  fields: [
    {
      name: 'id',
      type: 'uuid',
      primaryKey: true,
      allowNull: false,
      interface: 'id',
      comment: 'Unique identifier for the MFA factor',
      uiSchema: {
        type: 'string',
        title: 'Factor ID',
        'x-component': 'Input',
        'x-read-pretty': true,
      },
    },
    {
      name: 'user',
      type: 'belongsTo',
      foreignKey: 'user_id',
      target: 'users',
      targetKey: 'id',
      interface: 'm2o',
      comment: 'Reference to the user who owns this MFA factor',
      uiSchema: {
        type: 'array',
        title: 'User ID',
        'x-component': 'AssociationField',
        'x-component-props': {
          multiple: false,
          fieldNames: {label: 'id', value: 'id'},
        },
      },
    },
    {
      name: 'friendly_name',
      type: 'string',
      interface: 'input',
      comment:
        'User-defined display name for the factor (e.g., "My iPhone", "Work YubiKey")',
      uiSchema: {
        type: 'string',
        title: 'Friendly Name',
        'x-component': 'Input',
      },
    },
    {
      name: 'factor_type',
      type: 'string',
      allowNull: false,
      interface: 'select',
      comment: 'Type of MFA factor (TOTP, WebAuthn, or Phone/SMS)',
      uiSchema: {
        type: 'string',
        title: 'Factor Type',
        'x-component': 'Select',
        enum: [
          {label: 'TOTP', value: 'totp'},
          {label: 'WebAuthn', value: 'webauthn'},
          {label: 'Phone', value: 'phone'},
        ],
      },
    },
    {
      name: 'status',
      type: 'string',
      allowNull: false,
      interface: 'select',
      comment: 'Verification status of the factor',
      uiSchema: {
        type: 'string',
        title: 'Status',
        'x-component': 'Select',
        enum: [
          {label: 'Unverified', value: 'unverified'},
          {label: 'Verified', value: 'verified'},
        ],
      },
    },
    {
      name: 'secret',
      type: 'string',
      interface: 'password',
      comment: 'Shared secret for TOTP-based factors',
      uiSchema: {
        type: 'string',
        title: 'Secret',
        'x-component': 'Password',
      },
    },
    {
      name: 'phone',
      type: 'string',
      interface: 'input',
      comment: 'Phone number used for SMS or voice-based MFA',
      uiSchema: {
        type: 'string',
        title: 'Phone',
        'x-component': 'Input',
      },
    },
    {
      name: 'web_authn_credential',
      type: 'jsonb',
      comment:
        'Stored WebAuthn credential information (public key, transports, etc.)',
    },
    {
      name: 'web_authn_aaguid',
      type: 'uuid',
      interface: 'input',
      comment: 'AAGUID of the WebAuthn authenticator device',
      uiSchema: {
        type: 'string',
        title: 'WebAuthn AAGUID',
        'x-component': 'Input',
      },
    },
    {
      name: 'last_challenged_at',
      type: 'datetimeTz',
      interface: 'datepicker',
      comment: 'Timestamp of the most recent challenge sent to this factor',
      uiSchema: {
        type: 'datetime',
        title: 'Last Challenged At',
        'x-component': 'DatePicker',
      },
    },
    {
      name: 'last_webauthn_challenge_data',
      type: 'jsonb',
      comment:
        'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification',
    },
  ],
});
