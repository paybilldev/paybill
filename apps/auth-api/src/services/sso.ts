import {SSOBody} from '../openapi/index.js';

export const initiateSSO = async (body: SSOBody): Promise<{url: string}> => {
  // TODO: resolve provider from domain/provider_id and build auth URL
  return {
    url: `https://sso.example.com/auth?provider=${body.provider_id}`,
  };
};
