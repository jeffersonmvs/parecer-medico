// Public VAPID key — safe to ship to the client (it's public by design).
// The matching private key lives server-side in lib/server-secrets.
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_KEY ||
  "BPFr5CWqHSXkSnHMmS2tgbUV0-I2ocVwY9lAInf62LFoySWagdYES-h8MFD7I_N9eBmQ3H0KOXhI4x4Fb3qrNM4";
