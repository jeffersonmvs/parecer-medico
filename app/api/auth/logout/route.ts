import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  await audit({
    userId: user?.id,
    action: "auth.logout",
    entityType: "User",
    entityId: user?.id,
    request: req,
  });
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
