import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, badRequest, forbidden } from "@/lib/api";
import { can } from "@/lib/rbac";
import { improveNotice } from "@/lib/ai-notice";

const schema = z.object({
  title: z.string().min(1).max(400),
  body: z.string().min(1).max(4000),
});

// Polishes an institutional notice draft with the Claude API (or a heuristic
// fallback) before the author publishes it. Only staff who can publish notices
// may use it.
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!can(auth.user.role, "notice.publish")) return forbidden();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Dados inválidos");

  const improved = await improveNotice(parsed.data);
  return NextResponse.json(improved);
}
