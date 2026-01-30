import {Model} from '@paybilldev/sequelize';
import {v4 as uuidv4} from 'uuid';
import {FastifyRequest} from 'fastify';
import {UserModel} from './UserModel';

export enum AuditAction {
  Login = 'login',
  Logout = 'logout',
  InviteAccepted = 'invite_accepted',
  UserSignedUp = 'user_signedup',
  UserInvited = 'user_invited',
  UserDeleted = 'user_deleted',
  UserModified = 'user_modified',
  UserRecoveryRequested = 'user_recovery_requested',
  UserReauthenticate = 'user_reauthenticate_requested',
  UserConfirmationRequested = 'user_confirmation_requested',
  UserRepeatedSignUp = 'user_repeated_signup',
  UserUpdatePassword = 'user_updated_password',
  TokenRevoked = 'token_revoked',
  TokenRefreshed = 'token_refreshed',
  GenerateRecoveryCodes = 'generate_recovery_codes',
  EnrollFactor = 'factor_in_progress',
  UnenrollFactor = 'factor_unenrolled',
  CreateChallenge = 'challenge_created',
  VerifyFactor = 'verification_attempted',
  DeleteFactor = 'factor_deleted',
  DeleteRecoveryCodes = 'recovery_codes_deleted',
  UpdateFactor = 'factor_updated',
  MFACodeLogin = 'mfa_code_login',
  IdentityUnlink = 'identity_unlinked',
}

export interface AuditLogPayload {
  actor_id: string;
  actor_via_sso?: boolean;
  actor_username: string;
  actor_name?: string;
  action: string;
  traits?: Record<string, any>;
  audit_log_id?: string;
  ip_address?: string;
  created_at?: string;
  request_id?: string;
  user_agent?: string;
}

export class AuditLogEntryModel extends Model {
  /**
   * Create a new audit log entry
   */
  static async newAuditLogEntry(
    request: FastifyRequest,
    actor: UserModel,
    action: AuditAction,
    ipAddress: string,
    traits?: Record<string, any>,
  ) {
    const id = uuidv4();

    // Determine username
    let username = actor.email;
    if (actor.phone && actor.phone) {
      username = actor.phone;
    }

    // Base payload
    const payload: AuditLogPayload = {
      actor_id: actor.id,
      actor_via_sso: actor.is_sso_user,
      actor_username: username,
      action,
    };

    if (actor.app_metadata?.full_name) {
      payload.actor_name = actor.app_metadata.full_name;
    }

    if (traits) {
      payload.traits = traits;
    }

    // Add extra audit log info
    payload.audit_log_id = id;
    payload.ip_address = ipAddress;

    const requestId = (request as any).id || request.headers['x-request-id'];
    if (requestId) payload.request_id = requestId;

    const userAgent = request.headers['user-agent'];
    if (userAgent) payload.user_agent = userAgent;

    return await this.create({
      id,
      payload,
      ip_address: ipAddress,
    });
  }
}
