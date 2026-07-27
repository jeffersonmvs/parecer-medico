import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, forbidden, badRequest, notFound } from "@/lib/api";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";

// Full configuration payload for one hospital: its specialties (with
// coordinator, thresholds and responders), the doctors available to assign,
// and the current clinical director.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ hospitalId: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!can(auth.user.role, "hospital.configure")) return forbidden();

  const { hospitalId } = await params;

  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { id: true, name: true, directorId: true },
  });
  if (!hospital) return notFound("Hospital não encontrado");

  const [allSpecialties, hospitalSpecialties, doctors] = await Promise.all([
    prisma.specialty.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.hospitalSpecialty.findMany({
      where: { hospitalId },
      include: {
        specialty: { select: { id: true, name: true, code: true } },
        responders: { select: { userId: true } },
      },
      orderBy: { specialty: { name: "asc" } },
    }),
    // Doctors linked to this hospital (primary or via membership).
    prisma.user.findMany({
      where: {
        status: "ATIVO",
        OR: [{ hospitalId }, { hospitals: { some: { hospitalId } } }],
      },
      select: {
        id: true,
        name: true,
        crm: true,
        specialty: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    hospital,
    allSpecialties,
    doctors,
    specialties: hospitalSpecialties.map((hs) => ({
      id: hs.id,
      specialtyId: hs.specialtyId,
      specialty: hs.specialty,
      active: hs.active,
      mode: hs.mode,
      coordinatorId: hs.coordinatorId,
      renotifyMin: hs.renotifyMin,
      secondMin: hs.secondMin,
      coordMin: hs.coordMin,
      directionMin: hs.directionMin,
      responderIds: hs.responders.map((r) => r.userId),
    })),
  });
}

const patchSchema = z.object({
  directorId: z.string().nullable().optional(),
});

// Set the hospital's clinical director (4th escalation level).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ hospitalId: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!can(auth.user.role, "hospital.configure")) return forbidden();

  const { hospitalId } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Dados inválidos");

  const directorId = parsed.data.directorId || null;
  if (directorId) {
    const ok = await prisma.user.findUnique({
      where: { id: directorId },
      select: { id: true },
    });
    if (!ok) return badRequest("Diretor inválido");
  }

  await prisma.hospital.update({
    where: { id: hospitalId },
    data: { directorId },
  });
  await audit({
    userId: auth.user.id,
    action: "hospital.director.set",
    entityType: "Hospital",
    entityId: hospitalId,
    request: req,
  });

  return NextResponse.json({ ok: true });
}
