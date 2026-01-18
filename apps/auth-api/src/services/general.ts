import {SettingsResponse} from '../openapi/index.js';

export const getSettings = async (): Promise<SettingsResponse> => {
  return {
    disable_signup: false,
    mailer_autoconfirm: false,
    phone_autoconfirm: false,
    sms_provider: 'twilio',
    saml_enabled: true,
    external: {
      github: true,
      apple: true,
      email: true,
      phone: true,
    },
  };
};
