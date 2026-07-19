import { canTrackWithMarketingConsent } from '@/common/utils/marketing-consent.util';

describe('canTrackWithMarketingConsent', () => {
  it('blocks when pixel is not configured', () => {
    expect(
      canTrackWithMarketingConsent({
        pixelConfigured: false,
        isAuthenticated: false,
        consentLoaded: true,
        emailMarketing: true,
      }),
    ).toBe(false);
  });

  it('allows guests when pixel is configured', () => {
    expect(
      canTrackWithMarketingConsent({
        pixelConfigured: true,
        isAuthenticated: false,
        consentLoaded: false,
        emailMarketing: false,
      }),
    ).toBe(true);
  });

  it('waits for consent load for signed-in users', () => {
    expect(
      canTrackWithMarketingConsent({
        pixelConfigured: true,
        isAuthenticated: true,
        consentLoaded: false,
        emailMarketing: true,
      }),
    ).toBe(false);
  });

  it('tracks signed-in users only with marketing consent', () => {
    expect(
      canTrackWithMarketingConsent({
        pixelConfigured: true,
        isAuthenticated: true,
        consentLoaded: true,
        emailMarketing: true,
      }),
    ).toBe(true);
    expect(
      canTrackWithMarketingConsent({
        pixelConfigured: true,
        isAuthenticated: true,
        consentLoaded: true,
        emailMarketing: false,
      }),
    ).toBe(false);
  });
});
