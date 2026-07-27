import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, forbidden, badRequest } from "@/lib/api";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({
  active: z.boolean().optional(),
  coordinatorId: z.string().nullable().optional(),
  renotifyMin: z.number().int().min(1).max(1440).optional(),
  secondMin: z.number().int().min(1).max(1440).optional(),
  coordMin: z.number().int().min(1).max(1440).optional(),
  directionMin: z.number().int().min(1).max(1440).optional(),
  responderIds: z.array(z.string()).optional(),
});

// Update a hospital-specialty: coordinator, escalation thresholds, the
// responder routing list, or its active flag.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!can(auth.user.role, "hospital.configure")) return forbidden();

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Dados inválidos");
  const d = parsed.data;

  const hs = await prisma.hospitalSpecialty.findUnique({ where: { id } });
  if (!hs) return badRequest("Configuração não encontrada");

  // Thresholds must stay in ascending order to make sense.
  const renotify = d.renotifyMin ?? hs.renotifyMin;
  const second = d.secondMin ?? hs.secondMin;
  const coord = d.coordMin ?? hs.coordMin;
  const direction = d.directionMin ?? hs.directionMin;
  if (!(renotify <= second && second <= coord && coord <= direction)) {
    return badRequest(
      "Os tempos devem ser crescentes: renotificar ≤ especialidade ≤ coordenador ≤ direção.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.hospitalSpecialty.update({
      where: { id },
      data: {
        active: d.active ?? undefined,
        coordinatorId:
          d.coordinatorId === undefined ? undefined : d.coordinatorId || null,
        renotifyMin: d.renotifyMin ?? undefined,
        secondMin: d.secondMin ?? undefined,
        coordMin: d.coordMin ?? undefined,
        directionMin: d.directionMin ?? undefined,
      },
    });

    if (d.responderIds) {
      const wanted = [...new Set(d.responderIds)];
      await tx.parecerResponder.deleteMany({
        where: { hospitalSpecialtyId: id, userId: { notIn: wanted.length ? wanted : ["__none__"] } },
      });
      for (const userId of wanted) {
        await tx.parecerResponder.upsert({
          where: { hospitalSpecialtyId_userId: { hospitalSpecialtyId: id, userId } },
          create: { hospitalSpecialtyId: id, userId },
          update: {},
        });
      }
    }
  });

  await audit({
    userId: auth.user.id,
    action: "hospital.specialty.update",
    entityType: "HospitalSpecialty",
    entityId: id,
    request: req,
  });

  return NextResponse.json({ ok: true });
}

// Remove a specialty from a hospital (and its responders, via cascade).
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!can(auth.user.role, "hospital.configure")) return forbidden();

  const { id } = await params;
  await prisma.hospitalSpecialty.delete({ where: { id } }).catch(() => {});
  await audit({
    userId: auth.user.id,
    action: "hospital.specialty.remove",
    entityType: "HospitalSpecialty",
    entityId: id,
    request: req,
  });
  return NextResponse.json({ ok: true });
}
