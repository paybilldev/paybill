import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'identities',
  title: 'Identities',
  comment: 'Auth: Stores identities associated to a user.',
  model: 'IdentityModel',
  createdBy: false,
  updatedBy: false,
  createdAt: true,
  updatedAt: true,
  logging: true,
  shared: false,
  indexes: [
    {
      unique: true,
      fields: ['provider_id', 'provider'],
    },
  ],
  fields: [
    {
      name: 'id',
      type: 'uuid',
      primaryKey: true,
      autoFill: true,
      interface: 'id',
      comment: 'Unique identifier for the identity',
      uiSchema: {
        type: 'string',
        title: 'ID',
        'x-component': 'Input',
        'x-read-pretty': true,
      },
    },
    {
      name: 'provider_id',
      type: 'string',
      allowNull: false,
      interface: 'input',
      comment: 'ID provided by the identity provider (e.g., Google, GitHub)',
      uiSchema: {
        type: 'string',
        title: 'Provider ID',
        'x-component': 'Input',
      },
    },
    {
      name: 'user',
      type: 'belongsTo',
      foreignKey: 'user_id',
      target: 'users',
      targetKey: 'id',
      interface: 'm2o',
      comment: 'Reference to the user associated with this identity',
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
      name: 'identity_data',
      type: 'jsonb',
      allowNull: false,
      comment: 'Raw JSON data returned by the provider for this identity',
    },
    {
      name: 'provider',
      type: 'string',
      allowNull: false,
      interface: 'input',
      comment: 'Name of the identity provider (e.g., google, github)',
      uiSchema: {
        type: 'string',
        title: 'Provider',
        'x-component': 'Input',
      },
    },
    {
      name: 'last_sign_in_at',
      type: 'datetimeTz',
      interface: 'datepicker',
      comment: 'Timestamp of the last successful sign-in using this identity',
      uiSchema: {
        type: 'datetime',
        title: 'Last Sign In',
        'x-component': 'DatePicker',
      },
    },
    {
      name: 'email',
      type: 'string',
      interface: 'email',
      comment:
        'Email associated with the identity (computed from identity_data)',
      uiSchema: {
        type: 'string',
        title: 'Email (computed)',
        description: 'Generated from identity_data.email (lowercase)',
        'x-component': 'Input',
        'x-read-pretty': true,
      },
    },
  ],
});
