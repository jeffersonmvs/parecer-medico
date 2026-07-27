import "server-only";

// Central place for required server-side secrets.
//
// In normal deployments these come from the environment (`.env` locally,
// project env vars on a host that supports them). They are read here once so
// there is a single seam to feed them in when a deploy target cannot set
// environment variables directly.
export const DATABASE_URL = process.env.DATABASE_URL ?? "";
export const JWT_SECRET = process.env.JWT_SECRET ?? "";

// Shared token that lets the escalation cron endpoint be triggered manually.
// Vercel Cron invocations are recognized by their header and don't need it.
export const ESCALATION_KEY =
  process.env.ESCALATION_KEY ?? "hcw-escalation-3mug3j";

// Web Push (VAPID). The private key must stay server-side.
export const VAPID_PRIVATE =
  process.env.VAPID_PRIVATE ?? "j5zsJL7uu9AErulUmXvgkaiTx6DA94MPtKp6dyMkALw";
export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ?? "mailto:contato@parecer-medico.vercel.app";
