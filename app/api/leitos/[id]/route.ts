import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, forbidden, badRequest } from "@/lib/api";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { BED_STATUSES } from "@/lib/constants";

const schema = z.object({ status: z.enum(BED_STATUSES) });

// Altera a situação de um leito (Ativo / Em manutenção / Desativado).
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

  const bed = await prisma.bed.update({
    where: { id },
    data: { status: parsed.data.status },
    select: { id: true, status: true },
  });
  await audit({
    userId: auth.user.id,
    action: "bed.status",
    entityType: "Bed",
    entityId: id,
    request: req,
  });

  return NextResponse.json({ ok: true, bed });
}
