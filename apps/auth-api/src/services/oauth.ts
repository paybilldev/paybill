import {
  OAuthClientsBody,
  OAuthAuthorizationsAuthorizationIdConsentBody,
  OAuthClientResponse,
  OAuthAuthorizationResponse,
  OAuthConsentResponse,
} from '../openapi/index.js';

export const getOAuthAuthorization = async (id: string) =>
  ({}) as OAuthAuthorizationResponse;
export const postOAuthConsent = async (
  id: string,
  body: OAuthAuthorizationsAuthorizationIdConsentBody,
) => ({}) as OAuthConsentResponse;
export const buildAuthorizationRedirectUrl = async (query: any) => '/login'; // replace with actual logic
export const registerOAuthClient = async (body: OAuthClientsBody) =>
  ({}) as OAuthClientResponse;

export type OAuthClient = {
  id: string;
  clientSecretHash: string; // base64url(sha256(secret))
  isPublic(): boolean;
  isGrantTypeAllowed(grant_type: string): boolean;
};

//   Fetch client from DB (pseudo-code)
export async function findOAuthClientByID(
  clientID: string | undefined,
): Promise<OAuthClient | null> {
  // TODO: Replace with real DB lookup
  throw new Error('findOAuthClientByID not implemented yet');
}

export const buildOAuthAuthorizationUrl = async (params: {
  provider: string;
  scopes: string;
  invite_token?: string;
  redirect_to?: string;
  code_challenge_method?: 'plain' | 's256';
}): Promise<string> => {
  // TODO: Implement real URL construction
  return 'https://example.com/authorize';
};
