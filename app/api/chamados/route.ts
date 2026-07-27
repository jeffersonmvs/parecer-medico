import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, badRequest } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const calls = await prisma.institutionalCall.findMany({
    include: { requester: { select: { id: true, name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  return NextResponse.json({ calls });
}

const schema = z.object({
  type: z.string().min(2).max(80),
  description: z.string().max(1000).optional(),
  slaMinutes: z.number().int().min(5).max(1440),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  if (!user.hospitalId) return badRequest("Usuário sem hospital vinculado");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Dados inválidos");

  const call = await prisma.institutionalCall.create({
    data: {
      type: parsed.data.type.trim(),
      description: parsed.data.description?.trim() || null,
      slaMinutes: parsed.data.slaMinutes,
      requesterId: user.id,
      hospitalId: user.hospitalId,
    },
    include: { requester: { select: { id: true, name: true } } },
  });

  await audit({
    userId: user.id,
    action: "call.create",
    entityType: "InstitutionalCall",
    entityId: call.id,
    request: req,
  });

  return NextResponse.json({ call }, { status: 201 });
}
