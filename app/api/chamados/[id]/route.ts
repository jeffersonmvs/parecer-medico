import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, badRequest, notFound } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema = z.object({
  action: z.enum(["attend", "cancel"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const { id } = await params;

  const call = await prisma.institutionalCall.findUnique({ where: { id } });
  if (!call) return notFound("Chamado não encontrado");
  if (call.status !== "ABERTO")
    return badRequest("Este chamado já foi finalizado");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Ação inválida");

  const status = parsed.data.action === "attend" ? "ATENDIDO" : "CANCELADO";
  const updated = await prisma.institutionalCall.update({
    where: { id },
    data: { status, resolvedAt: new Date() },
  });

  await audit({
    userId: user.id,
    action: `call.${parsed.data.action}`,
    entityType: "InstitutionalCall",
    entityId: id,
    request: req,
  });

  return NextResponse.json({ call: updated });
}
