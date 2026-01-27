import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'saml_relay_states',
  title: 'SAML Relay States',
  comment:
    'Auth: Stores SAML Relay State information for Service Provider-initiated login flows, tracking requests and redirection after authentication.',
  model: 'SamlRelayStateModel',
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
      comment: 'Unique identifier for this relay state record',
      uiSchema: {
        type: 'string',
        title: 'Relay State ID',
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
      comment: 'Reference to the SSO provider associated with this relay state',
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
      name: 'request_id',
      type: 'string',
      allowNull: false,
      interface: 'input',
      comment: 'ID of the SAML request corresponding to this relay state',
      uiSchema: {
        type: 'string',
        title: 'Request ID',
        'x-component': 'Input',
        description: 'Non-empty ID representing the SAML request',
      },
    },
    {
      name: 'for_email',
      type: 'string',
      interface: 'input',
      comment:
        'Email address associated with the user for this SAML login flow',
      uiSchema: {
        type: 'string',
        title: 'For Email',
        'x-component': 'Input',
        description: 'Optional email used for identification in the flow',
      },
    },
    {
      name: 'redirect_to',
      type: 'string',
      interface: 'input',
      comment:
        'URL where the user will be redirected after completing the SAML authentication',
      uiSchema: {
        type: 'string',
        title: 'Redirect To',
        'x-component': 'Input',
        description: 'Target URL after SAML login flow completion',
      },
    },
    {
      name: 'flow',
      type: 'belongsTo',
      foreignKey: 'flow_state_id',
      target: 'flow_state',
      targetKey: 'id',
      interface: 'm2o',
      comment:
        'Reference to the flow state record associated with this relay state',
      uiSchema: {
        type: 'array',
        title: 'Flow State ID',
        'x-component': 'AssociationField',
        'x-component-props': {
          multiple: false,
          fieldNames: {label: 'id', value: 'id'},
        },
      },
    },
  ],
});
