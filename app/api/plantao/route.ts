import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, badRequest } from "@/lib/api";
import { audit } from "@/lib/audit";
import { SHIFT_STATUSES, OPEN_STATUSES } from "@/lib/constants";

// GET: the live shift board grouped by specialty, plus the caller's shift.
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const hospitalId = user.activeHospitalId ?? undefined;
  const [specialties, activeShifts, openPareceres] = await Promise.all([
    prisma.specialty.findMany({ orderBy: { name: "asc" } }),
    prisma.shift.findMany({
      where: { endedAt: null, ...(hospitalId ? { hospitalId } : {}) },
      include: {
        user: { select: { id: true, name: true, role: true, crm: true } },
      },
      orderBy: { startedAt: "asc" },
    }),
    prisma.parecer.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        ...(hospitalId ? { hospitalId } : {}),
      },
      select: {
        requestedSpecialtyId: true,
        createdAt: true,
        acceptedAt: true,
      },
    }),
  ]);

  const board = specialties.map((s) => {
    const onShift = activeShifts
      .filter((sh) => sh.specialtyId === s.id)
      .map((sh) => ({
        id: sh.id,
        status: sh.status,
        startedAt: sh.startedAt.toISOString(),
        user: sh.user,
      }));

    const pareceres = openPareceres.filter(
      (p) => p.requestedSpecialtyId === s.id,
    );
    const pending = pareceres.length;

    const responded = pareceres.filter((p) => p.acceptedAt);
    const avgResponseMs =
      responded.length > 0
        ? Math.round(
            responded.reduce(
              (acc, p) =>
                acc + (p.acceptedAt!.getTime() - p.createdAt.getTime()),
              0,
            ) / responded.length,
          )
        : null;

    return {
      id: s.id,
      name: s.name,
      code: s.code,
      onShift,
      pending,
      avgResponseMs,
    };
  });

  const myShift = activeShifts.find((sh) => sh.userId === user.id) ?? null;

  return NextResponse.json({
    board,
    myShift: myShift
      ? {
          id: myShift.id,
          status: myShift.status,
          startedAt: myShift.startedAt.toISOString(),
          specialtyId: myShift.specialtyId,
        }
      : null,
    canCheckIn: Boolean(user.specialtyId && user.activeHospitalId),
  });
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("checkin") }),
  z.object({ action: z.literal("checkout") }),
  z.object({ action: z.literal("status"), status: z.enum(SHIFT_STATUSES) }),
]);

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Ação inválida");
  const input = parsed.data;

  const current = await prisma.shift.findFirst({
    where: { userId: user.id, endedAt: null },
  });

  if (input.action === "checkin") {
    if (current) return badRequest("Você já está em plantão");
    if (!user.specialtyId || !user.activeHospitalId)
      return badRequest("Perfil sem especialidade/hospital vinculados");
    const shift = await prisma.shift.create({
      data: {
        userId: user.id,
        specialtyId: user.specialtyId,
        hospitalId: user.activeHospitalId,
        status: "AVAILABLE",
      },
    });
    await audit({
      userId: user.id,
      action: "shift.checkin",
      entityType: "Shift",
      entityId: shift.id,
      request: req,
    });
    return NextResponse.json({ shift });
  }

  if (!current) return badRequest("Você não está em plantão");

  if (input.action === "checkout") {
    const shift = await prisma.shift.update({
      where: { id: current.id },
      data: { endedAt: new Date(), status: "OFF" },
    });
    await audit({
      userId: user.id,
      action: "shift.checkout",
      entityType: "Shift",
      entityId: shift.id,
      request: req,
    });
    return NextResponse.json({ shift });
  }

  // status change
  const shift = await prisma.shift.update({
    where: { id: current.id },
    data: { status: input.status },
  });
  return NextResponse.json({ shift });
}
