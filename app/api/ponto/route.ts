import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, badRequest } from "@/lib/api";
import { audit } from "@/lib/audit";
import { distanceMeters } from "@/lib/geo";

// Estado atual do ponto: sessão aberta (se houver) e total trabalhado hoje.
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const hospitalId = user.activeHospitalId ?? undefined;

  const hospital = hospitalId
    ? await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: { geofenceEnabled: true, geofenceRadiusM: true },
      })
    : null;

  const open = await prisma.timeSession.findFirst({
    where: { userId: user.id, endedAt: null },
    orderBy: { startedAt: "desc" },
  });

  // Somatório do dia (sessões que começaram hoje).
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = await prisma.timeSession.findMany({
    where: { userId: user.id, startedAt: { gte: startOfDay } },
    select: { startedAt: true, endedAt: true },
  });
  const now = Date.now();
  const workedTodayMs = today.reduce(
    (acc, s) =>
      acc + ((s.endedAt ? s.endedAt.getTime() : now) - s.startedAt.getTime()),
    0,
  );

  return NextResponse.json({
    open: open
      ? { id: open.id, startedAt: open.startedAt, startInside: open.startInside }
      : null,
    workedTodayMs,
    geofenceEnabled: Boolean(hospital?.geofenceEnabled),
    geofenceRadiusM: hospital?.geofenceRadiusM ?? null,
  });
}

const schema = z.object({
  action: z.enum(["in", "out"]),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  if (!user.activeHospitalId) return badRequest("Usuário sem hospital vinculado");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Dados inválidos");
  const { action, lat, lng } = parsed.data;

  const hospital = await prisma.hospital.findUnique({
    where: { id: user.activeHospitalId },
    select: {
      geofenceEnabled: true,
      geofenceLat: true,
      geofenceLng: true,
      geofenceRadiusM: true,
    },
  });

  // Avalia a cerca. Com a cerca ativa e configurada, o registro é BLOQUEADO
  // fora do perímetro (ou se a localização não puder ser confirmada).
  let inside: boolean | null = null;
  let distance: number | null = null;
  const fenceActive =
    Boolean(hospital?.geofenceEnabled) &&
    hospital?.geofenceLat != null &&
    hospital?.geofenceLng != null;
  const radius = hospital?.geofenceRadiusM ?? 150;

  if (fenceActive) {
    if (lat == null || lng == null) {
      return badRequest(
        "Não foi possível confirmar sua localização. Ative o GPS e permita o acesso à localização para registrar o ponto.",
      );
    }
    distance = Math.round(
      distanceMeters(lat, lng, hospital!.geofenceLat!, hospital!.geofenceLng!),
    );
    inside = distance <= radius;
    if (!inside) {
      return NextResponse.json(
        {
          error: `Você está a ${distance} m do hospital (limite de ${radius} m). O registro só é permitido dentro da área.`,
          outside: true,
          distance,
          radius,
        },
        { status: 403 },
      );
    }
  }

  const open = await prisma.timeSession.findFirst({
    where: { userId: user.id, endedAt: null },
    orderBy: { startedAt: "desc" },
  });

  if (action === "in") {
    if (open) return badRequest("Você já registrou entrada. Registre a saída.");
    const session = await prisma.timeSession.create({
      data: {
        userId: user.id,
        hospitalId: user.activeHospitalId,
        startLat: lat ?? null,
        startLng: lng ?? null,
        startInside: inside,
      },
    });
    await audit({
      userId: user.id,
      action: "ponto.in",
      entityType: "TimeSession",
      entityId: session.id,
      request: req,
    });
    return NextResponse.json({ ok: true, session, inside, distance });
  }

  // out
  if (!open) return badRequest("Não há entrada registrada.");
  const session = await prisma.timeSession.update({
    where: { id: open.id },
    data: {
      endedAt: new Date(),
      endLat: lat ?? null,
      endLng: lng ?? null,
      endInside: inside,
    },
  });
  await audit({
    userId: user.id,
    action: "ponto.out",
    entityType: "TimeSession",
    entityId: session.id,
    request: req,
  });
  const workedMs = session.endedAt!.getTime() - session.startedAt.getTime();
  return NextResponse.json({ ok: true, session, inside, distance, workedMs });
}
