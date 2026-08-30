import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, badRequest, forbidden } from "@/lib/api";
import { can } from "@/lib/rbac";
import { activeTurnosNow } from "@/lib/numed";
import { TURNO_LABELS } from "@/lib/constants";

// Painel único de "presentes agora" — para coordenadores e direção.
// Lista os profissionais que declararam presença em turnos em andamento
// neste momento, agrupados por setor, com o estágio de confirmação de cada um.

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  // Acesso: quem homologa (coordenador/direção) ou audita (NUMED/direção).
  if (!can(user.role, "execucao.homologar") && !can(user.role, "execucao.auditar")) {
    return forbidden();
  }
  const hospitalId = user.activeHospitalId;
  if (!hospitalId) return badRequest("Usuário sem hospital vinculado");

  const active = activeTurnosNow();
  if (active.length === 0) {
    return NextResponse.json({ now: new Date(), total: 0, groups: [] });
  }

  // Registros dos turnos em andamento (par data+turno) no hospital ativo.
  const registries = await prisma.shiftRegistry.findMany({
    where: {
      hospitalId,
      OR: active.map((a) => ({ data: a.data, turno: a.turno })),
    },
    include: {
      sector: { select: { id: true, name: true } },
      presences: {
        where: { selfDeclared: true },
        include: {
          shiftDoctor: { select: { id: true, name: true, origem: true } },
        },
      },
    },
  });

  type Present = {
    doctorId: string;
    doctorName: string;
    origem: string;
    turno: string;
    turnoLabel: string;
    selfAt: Date | null;
    selfInside: boolean | null;
    nurseConfirmed: boolean | null;
    coordConfirmed: boolean | null;
  };

  const groups = new Map<
    string,
    { sectorId: string; sectorName: string; present: Present[] }
  >();
  let total = 0;

  for (const r of registries) {
    for (const p of r.presences) {
      total += 1;
      const g =
        groups.get(r.sector.id) ??
        (() => {
          const entry = {
            sectorId: r.sector.id,
            sectorName: r.sector.name,
            present: [] as Present[],
          };
          groups.set(r.sector.id, entry);
          return entry;
        })();
      g.present.push({
        doctorId: p.shiftDoctor.id,
        doctorName: p.shiftDoctor.name,
        origem: p.shiftDoctor.origem,
        turno: r.turno,
        turnoLabel: TURNO_LABELS[r.turno as keyof typeof TURNO_LABELS] ?? r.turno,
        selfAt: p.selfAt,
        selfInside: p.selfInside,
        nurseConfirmed: p.nurseConfirmed,
        coordConfirmed: p.coordConfirmed,
      });
    }
  }

  const list = [...groups.values()]
    .map((g) => ({
      ...g,
      present: g.present.sort((a, b) => a.doctorName.localeCompare(b.doctorName)),
    }))
    .sort((a, b) => a.sectorName.localeCompare(b.sectorName));

  return NextResponse.json({ now: new Date(), total, groups: list });
}
