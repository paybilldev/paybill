import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'instances',
  title: 'Instances',
  comment: 'Auth: Manages users across multiple sites.',
  model: 'InstanceModel',
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
      comment: 'Unique identifier for the instance',
      uiSchema: {
        type: 'string',
        title: 'Instance ID',
        'x-component': 'Input',
        'x-read-pretty': true,
      },
    },
    {
      name: 'uuid',
      type: 'uuid',
      interface: 'input',
      comment:
        'Globally unique UUID for the instance, separate from primary key',
      uiSchema: {
        type: 'string',
        title: 'UUID',
        'x-component': 'Input',
      },
    },
    {
      name: 'raw_base_config',
      type: 'text',
      interface: 'textarea',
      comment: 'Raw configuration data for the instance (stored as text)',
      uiSchema: {
        type: 'string',
        title: 'Raw Base Config',
        'x-component': 'Input.TextArea',
      },
    },
  ],
});
