/** Expiry presets in seconds (for API key creation). */
export const API_KEY_EXPIRY_PRESETS = {
  none: null,
  "7d": 7 * 24 * 60 * 60,
  "30d": 30 * 24 * 60 * 60,
  "90d": 90 * 24 * 60 * 60,
  "1y": 365 * 24 * 60 * 60,
} as const;

export type ApiKeyExpiryPreset = keyof typeof API_KEY_EXPIRY_PRESETS;
