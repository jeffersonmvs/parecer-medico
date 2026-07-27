import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, forbidden, badRequest, notFound } from "@/lib/api";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { ROLES, USER_STATUSES } from "@/lib/constants";

const schema = z.object({
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  specialtyId: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!can(auth.user.role, "users.manage")) return forbidden();

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return notFound("Usuário não encontrado");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Dados inválidos");
  const d = parsed.data;

  // Guard: an admin cannot lock themselves out.
  if (target.id === auth.user.id && d.status && d.status !== "ATIVO") {
    return badRequest("Você não pode alterar o próprio status.");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(d.role ? { role: d.role } : {}),
      ...(d.status ? { status: d.status } : {}),
      ...(d.specialtyId !== undefined ? { specialtyId: d.specialtyId } : {}),
    },
  });

  await audit({
    userId: auth.user.id,
    action: "users.update",
    entityType: "User",
    entityId: id,
    request: req,
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
