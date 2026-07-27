import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, badRequest, forbidden } from "@/lib/api";
import { signSession, setSessionCookie } from "@/lib/auth";
import { userCanUseHospital } from "@/lib/hospital";
import { audit } from "@/lib/audit";

const schema = z.object({ hospitalId: z.string().min(1) });

// Sets (or switches) the active hospital for the current session by re-signing
// the session token with the chosen hospital. Only hospitals the user belongs
// to are accepted.
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Dados inválidos");
  const { hospitalId } = parsed.data;

  if (!(await userCanUseHospital(user.id, hospitalId))) return forbidden();

  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { id: true, name: true },
  });
  if (!hospital) return badRequest("Hospital não encontrado");

  const token = await signSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    hid: hospital.id,
    hname: hospital.name,
  });
  await setSessionCookie(token);

  await audit({
    userId: user.id,
    action: "auth.hospital.select",
    entityType: "Hospital",
    entityId: hospital.id,
    request: req,
  });

  return NextResponse.json({ ok: true, hospital });
}
