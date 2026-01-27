import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'refresh_tokens',
  title: 'Refresh Tokens',
  comment:
    'Auth: Stores refresh tokens that can be used to obtain new JWT access tokens once the original tokens expire. Each token may belong to a specific user and session, and can be revoked if needed.',
  model: 'RefreshTokenModel',
  createdBy: false,
  updatedBy: false,
  createdAt: true,
  updatedAt: true,
  logging: true,
  shared: false,
  indexes: [
    {
      unique: true,
      fields: ['instance_id', 'user_id'],
    },
  ],
  fields: [
    {
      name: 'id',
      type: 'uuid',
      primaryKey: true,
      allowNull: false,
      interface: 'id',
      comment: 'Unique identifier for the refresh token record',
      uiSchema: {
        type: 'string',
        title: 'ID',
        'x-component': 'Input',
        'x-read-pretty': true,
      },
    },
    {
      name: 'instance_id',
      type: 'uuid',
      interface: 'input',
      comment:
        'Identifier of the instance this token belongs to (multi-site support)',
      uiSchema: {
        type: 'string',
        title: 'Instance ID',
        'x-component': 'Input',
      },
    },
    {
      name: 'token',
      type: 'string',
      unique: true,
      interface: 'input',
      comment:
        'The actual refresh token string (usually securely generated and stored hashed in DB)',
      uiSchema: {
        type: 'string',
        title: 'Token',
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
      comment: 'Reference to the user who owns this refresh token',
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
      name: 'revoked',
      type: 'boolean',
      interface: 'checkbox',
      comment:
        'Indicates whether this refresh token has been revoked and is no longer valid',
      uiSchema: {
        type: 'boolean',
        title: 'Revoked',
        'x-component': 'Switch',
      },
    },
    {
      name: 'parent',
      type: 'string',
      interface: 'input',
      comment:
        'Optional reference to the parent token if this refresh token was derived from a previous one',
      uiSchema: {
        type: 'string',
        title: 'Parent Token',
        'x-component': 'Input',
      },
    },
    {
      name: 'session',
      type: 'belongsTo',
      foreignKey: 'session_id',
      target: 'sessions',
      targetKey: 'id',
      interface: 'm2o',
      comment: 'Reference to the session associated with this refresh token',
      uiSchema: {
        type: 'array',
        title: 'Session ID',
        'x-component': 'AssociationField',
        'x-component-props': {
          multiple: false,
          fieldNames: {label: 'id', value: 'id'},
        },
      },
    },
  ],
});
