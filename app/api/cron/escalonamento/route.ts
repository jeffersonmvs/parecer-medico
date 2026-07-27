import { NextResponse } from "next/server";
import { runEscalation } from "@/lib/escalation";
import { ESCALATION_KEY } from "@/lib/server-secrets";

export const dynamic = "force-dynamic";

// Invoked by Vercel Cron (recognized by the `x-vercel-cron` header) or
// manually with `?key=`. Advances escalation for pareceres past their
// configured thresholds. Runs independently of the lazy in-request trigger.
export async function GET(req: Request) {
  const isVercelCron = req.headers.has("x-vercel-cron");
  const key = new URL(req.url).searchParams.get("key");
  if (!isVercelCron && key !== ESCALATION_KEY) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  const result = await runEscalation();
  return NextResponse.json({ ok: true, ...result });
}
