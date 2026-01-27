import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'sso_providers',
  title: 'SSO Providers',
  comment:
    'Auth: Manages SSO identity provider information; see saml_providers for SAML.',
  model: 'SsoProviderModel',
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
      comment: 'Unique identifier for the SSO provider record.',
      uiSchema: {
        type: 'string',
        title: 'Provider ID',
        'x-component': 'Input',
        'x-read-pretty': true,
      },
    },
    {
      name: 'resource_id',
      type: 'string',
      interface: 'input',
      comment:
        'User-defined unique identifier for the SSO provider. Useful for referencing providers in infrastructure as code. Case-insensitive uniqueness enforced.',
      uiSchema: {
        type: 'string',
        title: 'Resource ID',
        'x-component': 'Input',
      },
    },
    {
      name: 'disabled',
      type: 'boolean',
      interface: 'checkbox',
      comment:
        'Flag to indicate whether this SSO provider is disabled or inactive.',
      uiSchema: {
        type: 'boolean',
        title: 'Disabled',
        'x-component': 'Switch',
      },
    },
  ],
});
