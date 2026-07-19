export const MARKETING_CONSENT_STORAGE_KEY = 'marketingConsent';

export type MarketingConsentInput = {
  pixelConfigured: boolean;
  isAuthenticated: boolean;
  consentLoaded: boolean;
  emailMarketing: boolean;
};

/** Keep in sync with backend/src/common/utils/marketing-consent.util.ts */
export function canTrackWithMarketingConsent(input: MarketingConsentInput): boolean {
  if (!input.pixelConfigured) return false;
  if (!input.isAuthenticated) return true;
  if (!input.consentLoaded) return false;
  return input.emailMarketing;
}
