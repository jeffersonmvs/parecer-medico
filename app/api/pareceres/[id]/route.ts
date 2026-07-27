import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, badRequest, forbidden, notFound } from "@/lib/api";
import { audit } from "@/lib/audit";
import { canTransition } from "@/lib/parecer";
import { can } from "@/lib/rbac";
import {
  PRIORITIES,
  PARECER_STATUSES,
  type ParecerStatus,
} from "@/lib/constants";

const fullInclude = {
  requestingSpecialty: true,
  requestedSpecialty: true,
  requester: { select: { id: true, name: true, crm: true } },
  assignee: { select: { id: true, name: true, crm: true } },
  attachments: { orderBy: { createdAt: "desc" } },
  events: {
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true } } },
  },
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const parecer = await prisma.parecer.findUnique({
    where: { id },
    include: fullInclude,
  });
  if (!parecer) return notFound("Parecer não encontrado");
  return NextResponse.json({ parecer });
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("transition"),
    to: z.enum(PARECER_STATUSES),
    note: z.string().optional(),
    opinion: z.string().optional(),
    location: z.string().optional(),
  }),
  z.object({
    action: z.literal("priority"),
    priority: z.enum(PRIORITIES),
  }),
]);

// A doctor may act on a parecer if they belong to the requested specialty
// or hold an override capability (coordination / direction / admin).
function mayAct(
  user: { specialtyId: string | null; role: string },
  requestedSpecialtyId: string,
): boolean {
  if (can(user.role, "parecer.cancelAny")) return true;
  if (!can(user.role, "parecer.act")) return false;
  return user.specialtyId === requestedSpecialtyId;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const { id } = await params;

  const parecer = await prisma.parecer.findUnique({ where: { id } });
  if (!parecer) return notFound("Parecer não encontrado");

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return badRequest("Ação inválida");
  const input = parsed.data;

  /* --------------------------- priority change --------------------------- */
  if (input.action === "priority") {
    if (!mayAct(user, parecer.requestedSpecialtyId) && parecer.requesterId !== user.id)
      return forbidden();
    const updated = await prisma.parecer.update({
      where: { id },
      data: { priority: input.priority },
    });
    await prisma.parecerEvent.create({
      data: {
        parecerId: id,
        type: "PRIORITY",
        userId: user.id,
        note: `Prioridade alterada para ${input.priority}`,
      },
    });
    await audit({
      userId: user.id,
      action: "parecer.priority",
      entityType: "Parecer",
      entityId: id,
      request: req,
    });
    return NextResponse.json({ parecer: updated });
  }

  /* ----------------------------- transition ------------------------------ */
  const from = parecer.status as ParecerStatus;
  const to = input.to;

  if (!canTransition(from, to)) {
    return badRequest(`Transição inválida: ${from} → ${to}`);
  }

  // Requester can cancel their own request; otherwise acting requires
  // belonging to the requested specialty (or an override).
  const isCancel = to === "CANCELADO";
  const allowed = isCancel
    ? parecer.requesterId === user.id || mayAct(user, parecer.requestedSpecialtyId)
    : mayAct(user, parecer.requestedSpecialtyId);
  if (!allowed) return forbidden();

  if (to === "PARECER_REALIZADO" && !input.opinion?.trim()) {
    return badRequest("Descreva o parecer antes de registrar.");
  }

  // Time spent in the previous state.
  const lastStatusEvent = await prisma.parecerEvent.findFirst({
    where: { parecerId: id, type: "STATUS" },
    orderBy: { createdAt: "desc" },
  });
  const durationMs = lastStatusEvent
    ? Date.now() - lastStatusEvent.createdAt.getTime()
    : null;

  const data: Record<string, unknown> = { status: to };
  if (to === "ACEITO" && !parecer.assigneeId) {
    data.assigneeId = user.id;
    data.acceptedAt = new Date();
  }
  if (to === "PARECER_REALIZADO") data.opinion = input.opinion!.trim();
  if (to === "CONCLUIDO") data.completedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.parecer.update({ where: { id }, data });
    await tx.parecerEvent.create({
      data: {
        parecerId: id,
        type: "STATUS",
        fromStatus: from,
        toStatus: to,
        userId: user.id,
        note: input.note?.trim() || null,
        location: input.location?.trim() || null,
        durationMs,
      },
    });
    return u;
  });

  await audit({
    userId: user.id,
    action: `parecer.transition.${to}`,
    entityType: "Parecer",
    entityId: id,
    request: req,
  });

  return NextResponse.json({ parecer: updated });
}
