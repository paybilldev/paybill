import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'saml_providers',
  title: 'SAML Providers',
  comment:
    'Auth: Manages SAML Identity Provider connections for authentication flows.',
  model: 'SamlProviderModel',
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
      comment: 'Unique identifier for the SAML provider record',
      uiSchema: {
        type: 'string',
        title: 'SAML Provider ID',
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
        'Reference to the SSO provider that this SAML provider is linked to',
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
      name: 'entity_id',
      type: 'string',
      allowNull: false,
      unique: true,
      interface: 'input',
      comment: 'Unique entity ID used by the SAML Identity Provider',
      uiSchema: {
        type: 'string',
        title: 'Entity ID',
        'x-component': 'Input',
        description: 'Must be non-empty and unique for each SAML provider',
      },
    },
    {
      name: 'metadata_xml',
      type: 'text',
      allowNull: false,
      interface: 'textarea',
      comment:
        'XML metadata describing the SAML Identity Provider configuration',
      uiSchema: {
        type: 'string',
        title: 'Metadata XML',
        'x-component': 'Input.TextArea',
        description: 'SAML metadata in XML format (must be non-empty)',
      },
    },
    {
      name: 'metadata_url',
      type: 'string',
      interface: 'input',
      comment: 'Optional URL from which to fetch the SAML metadata',
      uiSchema: {
        type: 'string',
        title: 'Metadata URL',
        'x-component': 'Input',
        description: 'Optional URL to fetch metadata dynamically',
      },
    },
    {
      name: 'attribute_mapping',
      type: 'jsonb',
      comment: 'JSON object mapping SAML attributes to local user fields',
    },
    {
      name: 'name_id_format',
      type: 'string',
      interface: 'input',
      comment:
        'Format of the NameID expected from the Identity Provider (e.g., email, persistent, transient)',
      uiSchema: {
        type: 'string',
        title: 'Name ID Format',
        'x-component': 'Input',
      },
    },
  ],
});
