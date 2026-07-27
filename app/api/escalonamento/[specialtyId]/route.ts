import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, forbidden, badRequest, notFound } from "@/lib/api";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({
  renotifyAfter: z.number().int().min(1).max(1440),
  reassignAfter: z.number().int().min(1).max(1440),
  coordinatorAfter: z.number().int().min(1).max(1440),
  directorAfter: z.number().int().min(1).max(1440),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ specialtyId: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!can(auth.user.role, "escalation.configure")) return forbidden();

  const { specialtyId } = await params;
  const specialty = await prisma.specialty.findUnique({
    where: { id: specialtyId },
  });
  if (!specialty) return notFound("Especialidade não encontrada");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Valores inválidos");
  const c = parsed.data;

  // Thresholds must be strictly increasing to yield distinct levels.
  if (
    !(
      c.renotifyAfter < c.reassignAfter &&
      c.reassignAfter < c.coordinatorAfter &&
      c.coordinatorAfter < c.directorAfter
    )
  ) {
    return badRequest(
      "Os tempos devem ser crescentes: renotificar < reatribuir < coordenador < diretor.",
    );
  }

  const config = await prisma.escalationConfig.upsert({
    where: { specialtyId },
    update: { ...c },
    create: { specialtyId, ...c },
  });

  await audit({
    userId: auth.user.id,
    action: "escalation.configure",
    entityType: "Specialty",
    entityId: specialtyId,
    request: req,
  });

  return NextResponse.json({ config });
}
