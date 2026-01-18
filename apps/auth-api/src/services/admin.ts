import {
  AuditLogResponse,
  GenerateLinkBody,
  InviteBody,
  MFAFactorListResponse,
  MFAFactorResponse,
  OAuthClientListResponse,
  OAuthClientResponse,
  OAuthClientsBody,
  OAuthClientsClientIdBody,
  SSOProviderListResponse,
  SSOProviderResponse,
  SSOProvidersBody,
  SSOProvidersSSOProviderIdBody,
  UserBody,
  UserResponse,
  VerificationResponse,
} from '../openapi/index.js';

export const deleteSSOProvider = async (
  id: string,
): Promise<SSOProviderResponse> => ({}) as SSOProviderResponse;

export const updateSSOProvider = async (
  id: string,
  body: SSOProvidersSSOProviderIdBody,
): Promise<SSOProviderResponse> => ({}) as SSOProviderResponse;

export const getSSOProviderById = async (
  id: string,
): Promise<SSOProviderResponse> => ({}) as SSOProviderResponse;

export const createSSOProvider = async (
  body: SSOProvidersBody,
): Promise<SSOProviderResponse> => {
  return {} as SSOProviderResponse;
};
export const getSSOProviders = async (): Promise<SSOProviderListResponse> => {
  return {} as SSOProviderListResponse;
};

export const regenerateOAuthClientSecret = async (
  client_id: string,
): Promise<OAuthClientResponse> => {
  return {} as OAuthClientResponse;
};
export const deleteOAuthClient = async (client_id: string): Promise<void> => {};

export const updateOAuthClient = async (
  client_id: string,
  body: OAuthClientsClientIdBody,
): Promise<OAuthClientResponse> => {
  return {} as OAuthClientResponse;
};
export const getOAuthClientById = async (
  client_id: string,
): Promise<OAuthClientResponse> => {
  return {} as OAuthClientResponse;
};

export const postOAuthClient = async (
  body: OAuthClientsBody,
): Promise<OAuthClientResponse> => {
  return {} as OAuthClientResponse;
};

export const getOAuthClients = async (
  page: number,
  per_page: number,
): Promise<OAuthClientListResponse> => {
  // TODO:
  return {} as OAuthClientListResponse;
};

export const getAudit = async (
  page: number,
  per_page: number,
): Promise<AuditLogResponse> => {
  // TODO:
  return [] as AuditLogResponse;
};

export const deleteUser = async (userId: string): Promise<UserResponse> =>
  ({}) as UserResponse;

export const updateUser = async (
  userId: string,
  body: UserBody,
): Promise<UserResponse> => ({}) as UserResponse;

export const getUserById = async (userId: string): Promise<UserResponse> =>
  ({}) as UserResponse;

export const deleteUserFactor = async (
  userId: string,
  factorId: string,
): Promise<MFAFactorResponse> => {
  return {} as MFAFactorResponse;
};

export const updateUserFactor = async (
  userId: string,
  factorId: string,
  body: Record<string, unknown>,
): Promise<MFAFactorResponse> => ({}) as MFAFactorResponse;

export const getUserFactors = async (
  userId: string,
): Promise<MFAFactorListResponse> => [] as unknown as MFAFactorListResponse;

export const generate_link = async (
  body: GenerateLinkBody,
): Promise<VerificationResponse> => {
  return {} as VerificationResponse;
};

export const inviteUser = async (body: InviteBody): Promise<UserResponse> => {
  // TODO: create invitation, send email, return user
  return {} as UserResponse;
};
