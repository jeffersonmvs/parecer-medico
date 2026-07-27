import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, forbidden, badRequest } from "@/lib/api";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({ specialtyId: z.string().min(1) });

// Activate a specialty at a hospital (creates the HospitalSpecialty row).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ hospitalId: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!can(auth.user.role, "hospital.configure")) return forbidden();

  const { hospitalId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Dados inválidos");

  const existing = await prisma.hospitalSpecialty.findUnique({
    where: {
      hospitalId_specialtyId: { hospitalId, specialtyId: parsed.data.specialtyId },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id });
  }

  const hs = await prisma.hospitalSpecialty.create({
    data: { hospitalId, specialtyId: parsed.data.specialtyId },
  });
  await audit({
    userId: auth.user.id,
    action: "hospital.specialty.add",
    entityType: "HospitalSpecialty",
    entityId: hs.id,
    request: req,
  });

  return NextResponse.json({ ok: true, id: hs.id }, { status: 201 });
}
