import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'oauth_client_states',
  title: 'OAuth Client States',
  comment:
    'Auth: Stores temporary OAuth2/OIDC state and PKCE data when this system acts as an OAuth client to third-party identity providers (e.g. Google, GitHub, Apple). Used to prevent CSRF and bind authorization responses to requests.',
  model: 'OAuthClientStateModel',
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
      comment:
        'Unique OAuth state identifier sent to the external provider and validated on callback',
      uiSchema: {
        type: 'string',
        title: 'State ID',
        'x-component': 'Input',
        'x-read-pretty': true,
      },
    },
    {
      name: 'provider_type',
      type: 'string',
      allowNull: false,
      interface: 'input',
      comment:
        'Type of external OAuth provider (e.g. google, github, apple, azuread)',
      uiSchema: {
        type: 'string',
        title: 'Provider Type',
        'x-component': 'Input',
      },
    },
    {
      name: 'code_verifier',
      type: 'string',
      interface: 'input',
      comment:
        'PKCE code_verifier associated with this authorization request, used to validate the token exchange',
      uiSchema: {
        type: 'string',
        title: 'Code Verifier',
        'x-component': 'Input',
      },
    },
  ],
});
