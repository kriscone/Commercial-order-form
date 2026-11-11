/** Bump this when the saved-payment authorization text changes. */
export const COMMERCIAL_PAYMENT_CONSENT_VERSION = "commercial-off-session-v1";
export const LEGACY_FPO_PAYMENT_CONSENT_VERSION = "fpo-commercial-off-session-v1";

export function isSupportedPaymentConsentVersion(value: unknown): value is string {
  return value === COMMERCIAL_PAYMENT_CONSENT_VERSION || value === LEGACY_FPO_PAYMENT_CONSENT_VERSION;
}
