import "server-only";
import { prisma } from "./db";
import { OPEN_STATUSES } from "./constants";

export type DashboardMetrics = Awaited<ReturnType<typeof computeMetrics>>;

// Computes the operational + executive indicators in one pass over the
// pareceres. Fine for the MVP scale; a production build would push these
// aggregations into SQL / a read model.
export async function computeMetrics(hospitalId?: string | null) {
  const scope = hospitalId ? { hospitalId } : {};
  const [pareceres, specialties, activeShifts] = await Promise.all([
    prisma.parecer.findMany({
      where: scope,
      include: {
        requestedSpecialty: { select: { id: true, name: true, code: true } },
        requestingSpecialty: { select: { id: true, name: true, code: true } },
        assignee: { select: { id: true, name: true } },
      },
    }),
    prisma.specialty.findMany({ select: { id: true, name: true, code: true } }),
    prisma.shift.findMany({
      where: { endedAt: null, ...scope },
      select: { specialtyId: true },
    }),
  ]);

  const open = pareceres.filter((p) => OPEN_STATUSES.includes(p.status as never));
  const concluded = pareceres.filter((p) => p.status === "CONCLUIDO");
  const cancelled = pareceres.filter((p) => p.status === "CANCELADO");

  // Response times (accept - created)
  const responseTimes = pareceres
    .filter((p) => p.acceptedAt)
    .map((p) => p.acceptedAt!.getTime() - p.createdAt.getTime());
  const avgResponseMs =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;
  const maxResponseMs = responseTimes.length > 0 ? Math.max(...responseTimes) : null;

  // Priority distribution
  const byPriority = {
    EMERGENCIA: pareceres.filter((p) => p.priority === "EMERGENCIA").length,
    URGENTE: pareceres.filter((p) => p.priority === "URGENTE").length,
    ROTINA: pareceres.filter((p) => p.priority === "ROTINA").length,
  };

  // Most requested specialty (destino) & top requester (origem)
  const requestedCount = new Map<string, number>();
  const requestingCount = new Map<string, number>();
  const specResponse = new Map<string, number[]>();
  for (const p of pareceres) {
    requestedCount.set(
      p.requestedSpecialty.name,
      (requestedCount.get(p.requestedSpecialty.name) ?? 0) + 1,
    );
    requestingCount.set(
      p.requestingSpecialty.name,
      (requestingCount.get(p.requestingSpecialty.name) ?? 0) + 1,
    );
    if (p.acceptedAt) {
      const arr = specResponse.get(p.requestedSpecialty.name) ?? [];
      arr.push(p.acceptedAt.getTime() - p.createdAt.getTime());
      specResponse.set(p.requestedSpecialty.name, arr);
    }
  }

  const toSorted = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

  const requestedRanking = toSorted(requestedCount);
  const requestingRanking = toSorted(requestingCount);

  const timeBySpecialty = [...specResponse.entries()]
    .map(([label, arr]) => ({
      label,
      value: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length / 60000), // minutes
    }))
    .sort((a, b) => b.value - a.value);

  // Pending per specialty (for coverage / overload view)
  const pendingBySpecialty = specialties
    .map((s) => ({
      label: s.name,
      code: s.code,
      value: open.filter((p) => p.requestedSpecialtyId === s.id).length,
      staffed: activeShifts.some((sh) => sh.specialtyId === s.id),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  // Overloaded doctors (open pareceres assigned)
  const doctorLoad = new Map<string, number>();
  for (const p of open) {
    if (p.assignee) {
      doctorLoad.set(p.assignee.name, (doctorLoad.get(p.assignee.name) ?? 0) + 1);
    }
  }
  const doctorRanking = toSorted(doctorLoad);

  // Calls per hour of day (0..23)
  const perHour = new Array(24).fill(0) as number[];
  for (const p of pareceres) perHour[p.createdAt.getHours()] += 1;

  // Trend — last 7 days count
  const days: { label: string; value: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(start.getTime() + 24 * 3600 * 1000);
    const count = pareceres.filter(
      (p) => p.createdAt >= start && p.createdAt < end,
    ).length;
    days.push({
      label: start.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      value: count,
    });
  }

  const patientsWaiting = new Set(open.map((p) => p.patientRecord)).size;

  return {
    total: pareceres.length,
    pending: open.length,
    concluded: concluded.length,
    cancelled: cancelled.length,
    avgResponseMs,
    maxResponseMs,
    byPriority,
    requestedRanking,
    requestingRanking,
    timeBySpecialty,
    pendingBySpecialty,
    doctorRanking,
    perHour,
    trend: days,
    patientsWaiting,
    uncovered: pendingBySpecialty.filter((s) => !s.staffed),
  };
}
