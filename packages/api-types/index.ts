export type { webhooks as authWebhooks, $defs as $authDef } from './types/auth'
import type {
  paths as authPaths,
  components as authComponents,
  operations as authOperations,
} from './types/auth'

export interface paths extends authPaths {}

export interface operations extends authOperations {}

export interface components {
  schemas: authComponents['schemas']
  responses: authComponents['responses']
  parameters: authComponents['parameters']
  requestBodies: authComponents['requestBodies']
  headers: authComponents['headers']
  pathItems: authComponents['pathItems']
}
