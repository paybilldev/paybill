import {defineCollection, uid} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'oauth_clients',
  title: 'OAuth Clients',
  comment:
    'Auth: Stores registered OAuth2 / OpenID Connect client applications',
  model: 'OAuthClientModel',
  createdBy: false,
  updatedBy: false,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  logging: true,
  shared: true,
  fields: [
    {
      name: 'id',
      type: 'uuid',
      primaryKey: true,
      interface: 'id',
      comment: 'Unique identifier for the OAuth client (client_id)',
      uiSchema: {
        type: 'string',
        title: 'Client ID',
        'x-component': 'Input',
        'x-read-pretty': true,
      },
    },
    {
      name: 'client_secret_hash',
      type: 'string',
      interface: 'password',
      comment: 'Hashed client secret used to authenticate confidential clients',
      uiSchema: {
        type: 'string',
        title: 'Client Secret Hash',
        'x-component': 'Password',
      },
    },
    {
      name: 'registration_type',
      type: 'string',
      interface: 'select',
      comment:
        'Indicates whether the client was dynamically registered or manually created by an administrator',
      uiSchema: {
        type: 'string',
        title: 'Registration Type',
        'x-component': 'Select',
        enum: [
          {label: 'Dynamic', value: 'dynamic'},
          {label: 'Manual', value: 'manual'},
        ],
      },
    },
    {
      name: 'redirect_uris',
      type: 'text',
      allowNull: false,
      interface: 'textarea',
      comment:
        'List of allowed redirect URIs for OAuth authorization responses',
      uiSchema: {
        type: 'string',
        title: 'Redirect URIs',
        'x-component': 'Input.TextArea',
      },
    },
    {
      name: 'grant_types',
      type: 'text',
      allowNull: false,
      interface: 'textarea',
      comment:
        'OAuth2 grant types allowed for this client (e.g. authorization_code, refresh_token)',
      uiSchema: {
        type: 'string',
        title: 'Grant Types',
        'x-component': 'Input.TextArea',
      },
    },
    {
      name: 'client_name',
      type: 'string',
      interface: 'input',
      comment: 'Human-readable name of the client application',
      length: 1024,
      validation: {
        type: 'string',
        rules: [{key: `r_${uid()}`, name: 'max', args: {length: 1024}}],
      },
      uiSchema: {
        type: 'string',
        title: 'Client Name',
        'x-component': 'Input',
      },
    },
    {
      name: 'client_uri',
      type: 'string',
      interface: 'input',
      comment: 'Homepage URL of the client application',
      length: 2048,
      validation: {
        type: 'string',
        rules: [{key: `r_${uid()}`, name: 'max', args: {length: 2048}}],
      },
      uiSchema: {
        type: 'string',
        title: 'Client URI',
        'x-component': 'Input',
      },
    },
    {
      name: 'logo_uri',
      type: 'string',
      interface: 'input',
      comment: 'Logo URL displayed on consent and authorization screens',
      length: 2048,
      validation: {
        type: 'string',
        rules: [{key: `r_${uid()}`, name: 'max', args: {length: 2048}}],
      },
      uiSchema: {
        type: 'string',
        title: 'Logo URI',
        'x-component': 'Input',
      },
    },
    {
      name: 'client_type',
      type: 'string',
      defaultValue: 'confidential',
      interface: 'select',
      comment:
        'Specifies whether the client can keep credentials secret (confidential) or not (public)',
      uiSchema: {
        type: 'string',
        title: 'Client Type',
        'x-component': 'Select',
        enum: [
          {label: 'Public', value: 'public'},
          {label: 'Confidential', value: 'confidential'},
        ],
      },
    },
    {
      name: 'token_endpoint_auth_method',
      type: 'string',
      allowNull: false,
      interface: 'select',
      comment:
        'Authentication method used by the client when calling the token endpoint',
      uiSchema: {
        type: 'string',
        title: 'Token Endpoint Auth Method',
        'x-component': 'Select',
        enum: [
          {label: 'Client Secret Basic', value: 'client_secret_basic'},
          {label: 'Client Secret Post', value: 'client_secret_post'},
          {label: 'None', value: 'none'},
        ],
      },
    },
  ],
});
