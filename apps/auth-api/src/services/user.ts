import {FastifyRequest} from 'fastify';
import {
  AccessTokenResponse,
  FactorDeleteResponse,
  FactorResponse,
  FactorsBody,
  FactorsIdChallengeBody,
  FactorsIdVerifyBody,
  LinkIdentityQuery,
  OAuthGrantListResponse,
  TOTPPhoneChallengeResponse,
  UserBody,
  UserListResponse,
  UserResponse,
} from '../openapi/index.js';
import {WebAuthnChallengeResponse} from '../openapi/schemas/user.schema.js';

export async function getCurrentUser(): Promise<UserResponse> {
  // Implement your logic to fetch the current user
  return {} as UserResponse;
}

export async function updateCurrentUser(data: UserBody): Promise<UserResponse> {
  // Implement your logic to update the current user
  return {} as UserResponse;
}

export async function buildOAuthLinkIdentityUrl(
  options: LinkIdentityQuery,
): Promise<string> {
  // Implement logic to generate the OAuth authorization URL
  return `https://oauth.provider.com/auth?provider=${options.provider}&scopes=${encodeURIComponent(
    options.scopes,
  )}`;
}

export async function unlinkUserIdentity(identityId: string): Promise<void> {
  // Implement your logic to unlink the identity
  // Throw errors if the identity cannot be unlinked, e.g. single identity or not found
}

export async function listUserOAuthGrants(
  request: FastifyRequest,
): Promise<OAuthGrantListResponse> {
  // Replace with actual DB or service call
  return [];
}

export async function revokeOAuthGrant(request: FastifyRequest): Promise<void> {
  // Implement actual revocation logic:
  // - Mark consent as revoked
  // - Delete active sessions
  // - Invalidate refresh tokens
  // Throw errors if client_id is invalid or grant not found
}

export async function sendReauthenticationOTP(
  request: FastifyRequest,
): Promise<{message_id?: string}> {
  // Implement logic to send OTP via email or SMS
  // Return a message_id if available (optional)
  return {message_id: 'example-message-id'};
}

export const createFactor = async (body: FactorsBody) => ({}) as FactorResponse;

export const challengeFactor = async (
  factorId: string,
  body: FactorsIdChallengeBody,
) => ({}) as TOTPPhoneChallengeResponse | WebAuthnChallengeResponse;

export const verifyFactor = async (
  factorId: string,
  body: FactorsIdVerifyBody,
) => ({}) as AccessTokenResponse;

export const deleteFactor = async (factorId: string) =>
  ({}) as FactorDeleteResponse;

export const getUsers = async (
  page: number,
  per_page: number,
): Promise<UserListResponse> => ({}) as UserListResponse;
