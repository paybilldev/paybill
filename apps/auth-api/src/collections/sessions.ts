import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'sessions',
  title: 'Sessions',
  comment:
    'Auth: Stores session data associated with a user, including OAuth client references and refresh token info.',
  model: 'SessionModel',
  createdBy: false,
  updatedBy: false,
  createdAt: true,
  updatedAt: true,
  logging: true,
  shared: false,
  fields: [
    {
      name: 'id',
      type: 'uuid',
      primaryKey: true,
      allowNull: false,
      interface: 'id',
      comment: 'Unique identifier for the session record',
      uiSchema: {
        type: 'string',
        title: 'Session ID',
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
      comment: 'Reference to the user associated with this session',
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
      name: 'factor_id',
      type: 'uuid',
      interface: 'input',
      comment: 'Optional ID of the MFA factor used in this session',
      uiSchema: {type: 'string', title: 'Factor ID', 'x-component': 'Input'},
    },
    {
      name: 'aal',
      type: 'string',
      interface: 'select',
      comment: 'Authentication Assurance Level (AAL) of this session',
      uiSchema: {
        type: 'string',
        title: 'AAL Level',
        'x-component': 'Select',
        enum: [
          {label: 'AAL1', value: 'aal1'},
          {label: 'AAL2', value: 'aal2'},
          {label: 'AAL3', value: 'aal3'},
        ],
      },
    },
    {
      name: 'not_after',
      type: 'datetimeTz',
      interface: 'datepicker',
      comment:
        'Timestamp after which this session should be considered expired. Nullable if session is indefinite.',
      uiSchema: {
        type: 'datetime',
        title: 'Not After',
        description: 'Session expires after this time',
        'x-component': 'DatePicker',
      },
    },
    {
      name: 'refreshed_at',
      type: 'datetimeTz',
      interface: 'datepicker',
      comment: 'Last time the session was refreshed (e.g., refresh token used)',
      uiSchema: {
        type: 'datetime',
        title: 'Refreshed At',
        'x-component': 'DatePicker',
      },
    },
    {
      name: 'user_agent',
      type: 'text',
      interface: 'textarea',
      comment:
        'User-Agent string from the device/browser used to initiate this session',
      uiSchema: {
        type: 'string',
        title: 'User Agent',
        'x-component': 'Input.TextArea',
      },
    },
    {
      name: 'ip',
      type: 'string',
      interface: 'input',
      comment: 'IP address from which the session was created or last used',
      uiSchema: {type: 'string', title: 'IP Address', 'x-component': 'Input'},
    },
    {
      name: 'tag',
      type: 'string',
      interface: 'input',
      comment: 'Optional tag to categorize or label the session',
      uiSchema: {type: 'string', title: 'Tag', 'x-component': 'Input'},
    },
    {
      name: 'oauth_client',
      type: 'belongsTo',
      foreignKey: 'oauth_client_id',
      target: 'oauth_clients',
      targetKey: 'id',
      interface: 'm2o',
      comment: 'Reference to the OAuth client associated with this session',
      uiSchema: {
        type: 'array',
        title: 'OAuth Client ID',
        'x-component': 'AssociationField',
        'x-component-props': {
          multiple: false,
          fieldNames: {label: 'id', value: 'id'},
        },
      },
    },
    {
      name: 'refresh_token_hmac_key',
      type: 'string',
      interface: 'password',
      comment:
        'Holds a HMAC-SHA256 key used to sign refresh tokens for this session',
      uiSchema: {
        type: 'string',
        title: 'Refresh Token HMAC Key',
        'x-component': 'Password',
      },
    },
    {
      name: 'refresh_token_counter',
      type: 'bigInt',
      interface: 'number',
      comment: 'Counter of the last issued refresh token for this session',
      uiSchema: {
        type: 'number',
        title: 'Refresh Token Counter',
        'x-component': 'Input',
      },
    },
    {
      name: 'scopes',
      type: 'string',
      interface: 'input',
      length: 4096,
      comment:
        'Scopes associated with this session, defining access permissions',
      uiSchema: {type: 'string', title: 'Scopes', 'x-component': 'Input'},
    },
  ],
});
