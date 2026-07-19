export type MarketingConsentInput = {
  pixelConfigured: boolean;
  isAuthenticated: boolean;
  consentLoaded: boolean;
  emailMarketing: boolean;
};

/** Guests may track; signed-in users require loaded marketing consent. */
export function canTrackWithMarketingConsent(input: MarketingConsentInput): boolean {
  if (!input.pixelConfigured) return false;
  if (!input.isAuthenticated) return true;
  if (!input.consentLoaded) return false;
  return input.emailMarketing;
}
