import {defineCollection} from '@paybilldev/sequelize';

export default defineCollection({
  dumpRules: {group: 'auth'},
  migrationRules: ['schema-only', 'overwrite'],
  name: 'audit_log_entries',
  title: 'Audit Log Entries',
  comment: 'Auth: Audit trail for user actions.',
  model: 'AuditLogEntryModel',
  createdBy: false,
  updatedBy: false,
  createdAt: true,
  updatedAt: false,
  logging: true,
  shared: false,
  fields: [
    {
      name: 'instance_id',
      type: 'uuid',
      interface: 'input',
      comment: 'Optional instance identifier for multi-tenant tracking',
      uiSchema: {
        type: 'string',
        title: 'Instance ID',
        'x-component': 'Input',
      },
    },
    {
      name: 'id',
      type: 'uuid',
      primaryKey: true,
      allowNull: false,
      interface: 'id',
      comment: 'Unique identifier for the audit log entry',
      uiSchema: {
        type: 'string',
        title: 'Entry ID',
        'x-component': 'Input',
        'x-read-pretty': true,
      },
    },
    {
      name: 'payload',
      type: 'json',
      interface: 'json',
      comment: 'JSON object containing the details of the logged action',
      uiSchema: {
        type: 'object',
        title: 'Payload',
        'x-component': 'JSONInput',
      },
    },
    {
      name: 'ip_address',
      type: 'string',
      interface: 'input',
      comment: 'IP address of the user performing the action',
      uiSchema: {
        type: 'string',
        title: 'IP Address',
        'x-component': 'Input',
      },
    },
  ],
});
