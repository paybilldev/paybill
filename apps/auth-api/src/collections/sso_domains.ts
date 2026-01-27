import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {
    group: 'auth',
  },
  migrationRules: ['schema-only', 'overwrite'],
  name: 'sso_domains',
  title: 'SSO Domains',
  comment:
    'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.',
  model: 'SSODomainModel',
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
      comment: 'Unique identifier for the SSO domain record',
      uiSchema: {
        type: 'string',
        title: 'Domain ID',
        'x-component': 'Input',
        'x-read-pretty': true,
      },
    },
    {
      name: 'sso_provider',
      type: 'belongsTo',
      foreignKey: 'sso_provider_id',
      target: 'sso_providers',
      targetKey: 'id',
      interface: 'm2o',
      comment:
        'Reference to the SSO provider associated with this domain. Links the domain to a specific identity provider.',
      uiSchema: {
        type: 'array',
        title: 'SSO Provider ID',
        'x-component': 'AssociationField',
        'x-component-props': {
          multiple: false,
          fieldNames: {label: 'id', value: 'id'},
        },
      },
    },
    {
      name: 'domain',
      type: 'string',
      unique: true,
      allowNull: false,
      interface: 'input',
      comment:
        'The email domain (e.g., example.com) mapped to an SSO provider. Must be unique and non-empty.',
      uiSchema: {
        type: 'string',
        title: 'Domain',
        'x-component': 'Input',
        'x-validator': 'required',
      },
    },
  ],
});
