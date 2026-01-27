import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'one_time_tokens',
  title: 'One-Time Tokens',
  comment:
    'Auth: Stores hashed, single-use tokens for sensitive user actions such as email confirmation, password recovery, reauthentication, and contact detail changes.',
  model: 'OneTimeTokenModel',
  createdBy: false,
  updatedBy: false,
  createdAt: true,
  updatedAt: true,
  logging: true,
  shared: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'token_type'],
    },
  ],
  fields: [
    {
      name: 'id',
      type: 'uuid',
      primaryKey: true,
      interface: 'id',
      comment: 'Unique identifier for this one-time token record',
      uiSchema: {
        type: 'string',
        title: 'Token ID',
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
      comment: 'User to whom this one-time token was issued',
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
      name: 'token_type',
      type: 'string',
      allowNull: false,
      interface: 'select',
      comment:
        'Purpose of the token (e.g. account confirmation, recovery, reauthentication, or contact detail change)',
      uiSchema: {
        type: 'string',
        title: 'Token Type',
        'x-component': 'Select',
        enum: [
          {label: 'Confirmation', value: 'confirmation_token'},
          {label: 'Reauthentication', value: 'reauthentication_token'},
          {label: 'Recovery', value: 'recovery_token'},
          {label: 'Email Change (New)', value: 'email_change_token_new'},
          {
            label: 'Email Change (Current)',
            value: 'email_change_token_current',
          },
          {label: 'Phone Change', value: 'phone_change_token'},
        ],
      },
    },
    {
      name: 'token_hash',
      type: 'string',
      allowNull: false,
      interface: 'password',
      comment:
        'Hashed value of the one-time token; the raw token is never stored for security reasons',
      uiSchema: {
        type: 'string',
        title: 'Token Hash',
        'x-component': 'Password',
      },
    },
    {
      name: 'relates_to',
      type: 'string',
      allowNull: false,
      interface: 'input',
      comment:
        'Context or target of the token, such as an email address or phone number being verified or changed',
      uiSchema: {type: 'string', title: 'Relates To', 'x-component': 'Input'},
    },
  ],
});
