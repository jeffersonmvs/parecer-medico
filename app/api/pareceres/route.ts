import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, badRequest, forbidden } from "@/lib/api";
import { audit } from "@/lib/audit";
import { ticketCode } from "@/lib/parecer";
import { can } from "@/lib/rbac";
import { PRIORITIES, PARECER_STATUSES } from "@/lib/constants";
import { parecerListInclude } from "@/lib/queries";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const scope = url.searchParams.get("scope"); // "mine" | "forme" | "all"

  const where: Record<string, unknown> = {};
  if (status && PARECER_STATUSES.includes(status as never))
    where.status = status;
  if (priority && PRIORITIES.includes(priority as never))
    where.priority = priority;
  if (scope === "mine") where.requesterId = user.id;
  if (scope === "forme") {
    // Pareceres directed at my specialty (the ones I can act on).
    where.requestedSpecialtyId = user.specialtyId ?? "__none__";
  }

  const pareceres = await prisma.parecer.findMany({
    where,
    include: parecerListInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ pareceres });
}

const createSchema = z.object({
  patientName: z.string().min(2, "Informe o nome do paciente"),
  patientRecord: z.string().min(1, "Informe o prontuário"),
  bed: z.string().optional(),
  requestedSpecialtyId: z.string().min(1, "Selecione a especialidade"),
  diagnosis: z.string().min(2, "Informe a hipótese diagnóstica"),
  reason: z.string().min(2, "Informe o motivo"),
  clinicalSummary: z.string().min(2, "Informe o resumo clínico"),
  priority: z.enum(PRIORITIES),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  if (!can(user.role, "parecer.create")) return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      "Dados inválidos",
      parsed.error.flatten().fieldErrors,
    );
  }
  const data = parsed.data;

  if (!user.hospitalId) {
    return badRequest("Usuário sem hospital vinculado");
  }
  if (!user.specialtyId) {
    return badRequest("Usuário sem especialidade vinculada");
  }

  const parecer = await prisma.$transaction(async (tx) => {
    const count = await tx.parecer.count();
    const created = await tx.parecer.create({
      data: {
        code: ticketCode(count + 1),
        patientName: data.patientName,
        patientRecord: data.patientRecord,
        bed: data.bed || null,
        diagnosis: data.diagnosis,
        reason: data.reason,
        clinicalSummary: data.clinicalSummary,
        priority: data.priority,
        status: "SOLICITADO",
        hospitalId: user.hospitalId!,
        requestingSpecialtyId: user.specialtyId!,
        requestedSpecialtyId: data.requestedSpecialtyId,
        requesterId: user.id,
      },
    });
    await tx.parecerEvent.create({
      data: {
        parecerId: created.id,
        type: "STATUS",
        toStatus: "SOLICITADO",
        userId: user.id,
        note: "Parecer solicitado",
      },
    });
    return created;
  });

  await audit({
    userId: user.id,
    action: "parecer.create",
    entityType: "Parecer",
    entityId: parecer.id,
    request: req,
  });

  return NextResponse.json({ parecer }, { status: 201 });
}
