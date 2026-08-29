import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, badRequest, forbidden } from "@/lib/api";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { distanceMeters } from "@/lib/geo";
import {
  registryDate,
  prazoFor,
  guessTurno,
  declarationWindow,
  isDeclarationOpen,
  openTurnos,
} from "@/lib/numed";
import { TURNO_LABELS, TURNOS } from "@/lib/constants";

function hhmm(d: Date): string {
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

// Registro de Execução de Plantão — declaração do próprio médico.
//
// Fluxo (revisado): o médico presente informa no app que está no plantão
// (com geolocalização); a enfermeira do setor confirma; o coordenador
// homologa no dia seguinte. Esta rota cobre a 1ª etapa (auto-declaração).

// Resolve o cadastro de plantonista (ShiftDoctor) vinculado ao usuário logado,
// com os setores em que ele atua no hospital ativo.
async function resolveRoster(userId: string, hospitalId: string) {
  return prisma.shiftDoctor.findFirst({
    where: { userId, hospitalId, status: "ativo" },
    include: {
      sectors: {
        include: { sector: { select: { id: true, name: true, active: true } } },
      },
    },
  });
}

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  if (!can(user.role, "execucao.declarar")) return forbidden();
  const hospitalId = user.activeHospitalId;
  if (!hospitalId) return badRequest("Usuário sem hospital vinculado");

  const roster = await resolveRoster(user.id, hospitalId);
  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { geofenceEnabled: true, geofenceRadiusM: true },
  });

  const open = openTurnos();
  const turnos = TURNOS.map((t) => ({
    value: t,
    label: TURNO_LABELS[t],
    open: open.includes(t),
    closesAt: declarationWindow(t).closesAt,
  }));

  if (!roster) {
    return NextResponse.json({
      enrolled: false,
      sectors: [],
      turno: guessTurno(),
      turnos,
      today: [],
    });
  }

  const sectors = roster.sectors
    .map((s) => s.sector)
    .filter((s) => s.active)
    .map((s) => ({ id: s.id, name: s.name }));

  // Declarações do próprio médico na data-calendário de hoje (qualquer turno).
  const today = registryDate();
  const presences = await prisma.shiftPresence.findMany({
    where: {
      shiftDoctorId: roster.id,
      registry: { data: today },
    },
    include: {
      registry: {
        include: { sector: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({
    enrolled: true,
    doctorName: roster.name,
    sectors,
    turno: guessTurno(),
    turnos,
    geofenceEnabled: Boolean(hospital?.geofenceEnabled),
    geofenceRadiusM: hospital?.geofenceRadiusM ?? null,
    today: presences.map((p) => ({
      sectorId: p.registry.sectorId,
      sectorName: p.registry.sector.name,
      turno: p.registry.turno,
      turnoLabel:
        TURNO_LABELS[p.registry.turno as keyof typeof TURNO_LABELS] ??
        p.registry.turno,
      selfAt: p.selfAt,
      selfInside: p.selfInside,
      nurseConfirmed: p.nurseConfirmed,
      coordConfirmed: p.coordConfirmed,
      status: p.registry.status,
    })),
  });
}

const schema = z.object({
  sectorId: z.string().min(1),
  turno: z.enum(TURNOS),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  if (!can(user.role, "execucao.declarar")) return forbidden();
  const hospitalId = user.activeHospitalId;
  if (!hospitalId) return badRequest("Usuário sem hospital vinculado");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Dados inválidos");
  const { sectorId, turno, lat, lng } = parsed.data;

  const roster = await resolveRoster(user.id, hospitalId);
  if (!roster) {
    return badRequest(
      "Seu usuário ainda não está vinculado à escala de plantonistas do NUMED. Procure o NUMED para o cadastro.",
    );
  }
  const belongs = roster.sectors.some((s) => s.sectorId === sectorId);
  if (!belongs) return forbidden("Você não atua neste setor.");

  // A presença deve ser declarada em até 2h após o início da jornada.
  if (!isDeclarationOpen(turno)) {
    const w = declarationWindow(turno);
    return badRequest(
      `Fora do prazo de declaração do turno ${TURNO_LABELS[turno]}. ` +
        `A declaração é permitida das ${hhmm(w.opensAt)} às ${hhmm(w.closesAt)} ` +
        `(até 2h após o início às ${hhmm(w.startsAt)}).`,
    );
  }

  const sector = await prisma.sector.findFirst({
    where: { id: sectorId, hospitalId },
    include: { hospital: { select: { geofenceLat: true, geofenceLng: true, geofenceRadiusM: true, geofenceEnabled: true } } },
  });
  if (!sector) return badRequest("Setor inválido.");

  // Geolocalização: registramos a posição e se está dentro do perímetro. Ao
  // contrário do ponto, a declaração NÃO é bloqueada fora da área — a presença
  // ainda passa pela confirmação da enfermeira e homologação do coordenador —
  // mas a divergência de localização fica gravada para auditoria do NUMED.
  let inside: boolean | null = null;
  let distance: number | null = null;
  const h = sector.hospital;
  const fenceActive =
    Boolean(h.geofenceEnabled) && h.geofenceLat != null && h.geofenceLng != null;
  if (fenceActive && lat != null && lng != null) {
    distance = Math.round(
      distanceMeters(lat, lng, h.geofenceLat!, h.geofenceLng!),
    );
    inside = distance <= (h.geofenceRadiusM ?? 150);
  }

  const data = registryDate();

  // Encontra ou cria o registro do plantão (setor + data + turno).
  const registry = await prisma.shiftRegistry.upsert({
    where: { sectorId_data_turno: { sectorId, data, turno } },
    update: {},
    create: {
      hospitalId,
      sectorId,
      data,
      turno,
      status: "aberto",
      prazo: prazoFor(data),
    },
  });

  const now = new Date();
  const presence = await prisma.shiftPresence.upsert({
    where: {
      registryId_shiftDoctorId: {
        registryId: registry.id,
        shiftDoctorId: roster.id,
      },
    },
    update: {
      selfDeclared: true,
      selfAt: now,
      selfLat: lat ?? null,
      selfLng: lng ?? null,
      selfInside: inside,
      selfById: user.id,
    },
    create: {
      registryId: registry.id,
      shiftDoctorId: roster.id,
      fonte: "lista",
      selfDeclared: true,
      selfAt: now,
      selfLat: lat ?? null,
      selfLng: lng ?? null,
      selfInside: inside,
      selfById: user.id,
    },
  });

  await audit({
    userId: user.id,
    action: "execucao.declarar",
    entityType: "ShiftPresence",
    entityId: presence.id,
    request: req,
  });

  return NextResponse.json({
    ok: true,
    inside,
    distance,
    sectorName: sector.name,
    turnoLabel: TURNO_LABELS[turno],
  });
}
