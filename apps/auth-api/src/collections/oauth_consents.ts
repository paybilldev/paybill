import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'oauth_consents',
  title: 'OAuth Consents',
  comment:
    'Auth: Stores user consent records for OAuth clients, tracking which scopes a user has approved and whether the consent is active or revoked.',
  model: 'OAuthConsentModel',
  createdBy: false,
  updatedBy: false,
  logging: true,
  shared: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'client_id'],
    },
  ],
  fields: [
    {
      name: 'id',
      type: 'uuid',
      primaryKey: true,
      allowNull: false,
      interface: 'id',
      comment: 'Unique identifier for this consent record',
      uiSchema: {
        type: 'string',
        title: 'Consent ID',
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
      comment: 'User who granted consent to the OAuth client',
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
      name: 'oauth_client',
      type: 'belongsTo',
      foreignKey: 'client_id',
      target: 'oauth_clients',
      targetKey: 'id',
      interface: 'm2o',
      comment: 'OAuth client application that received the user’s consent',
      uiSchema: {
        type: 'array',
        title: 'Client ID',
        'x-component': 'AssociationField',
        'x-component-props': {
          multiple: false,
          fieldNames: {label: 'id', value: 'id'},
        },
      },
    },
    {
      name: 'scopes',
      type: 'string',
      allowNull: false,
      interface: 'input',
      length: 2048,
      comment:
        'Space-delimited list of OAuth scopes that the user has approved for this client',
      uiSchema: {
        type: 'string',
        title: 'Scopes',
        'x-component': 'Input',
      },
    },
    {
      name: 'granted_at',
      type: 'datetimeTz',
      defaultToCurrentTime: true,
      interface: 'created_at',
      comment: 'Timestamp when the user granted consent to the client',
      uiSchema: {
        type: 'datetime',
        title: 'Granted At',
        'x-component': 'DatePicker',
        'x-read-pretty': true,
      },
    },
    {
      name: 'revoked_at',
      type: 'datetimeTz',
      interface: 'datepicker',
      comment:
        'Timestamp when the user revoked this consent; NULL means the consent is still active',
      uiSchema: {
        type: 'datetime',
        title: 'Revoked At',
        'x-component': 'DatePicker',
      },
    },
  ],
});
