import "server-only";
import { prisma } from "./db";
import { audit } from "./audit";
import { sendPushToUsers, type PushPayload } from "./push";

// Escalation levels for a parecer awaiting acceptance:
//   1 = on-shift doctors of the specialty (re-notified every `renotifyMin`)
//   2 = all responders of the specialty at the hospital
//   3 = specialty coordinator
//   4 = clinical direction
const LEVEL_NOTE: Record<number, string> = {
  2: "Escalonado: notificados todos os médicos da especialidade no hospital",
  3: "Escalonado ao Coordenador da especialidade",
  4: "Escalonado à Direção Clínica",
};

const DEFAULTS = { renotifyMin: 5, secondMin: 30, coordMin: 60, directionMin: 90 };

function parecerPush(
  p: { code: string; patientName: string; reason: string; id: string },
  title: string,
): PushPayload {
  return {
    title,
    body: `${p.code} · ${p.patientName} — ${p.reason}`,
    url: `/pareceres/${p.id}`,
  };
}

/**
 * Evaluate every parecer still awaiting acceptance and notify the right people
 * for the elapsed time. Idempotent per level: broader audiences (2–4) are
 * notified once when their threshold is crossed; the on-shift group (level 1)
 * is re-notified every `renotifyMin` minutes until the parecer is accepted.
 */
export async function runEscalation(): Promise<{ escalated: number }> {
  const now = Date.now();

  const pending = await prisma.parecer.findMany({
    where: { status: { in: ["SOLICITADO", "RECEBIDO"] }, acceptedAt: null },
    select: {
      id: true,
      code: true,
      patientName: true,
      reason: true,
      hospitalId: true,
      requestedSpecialtyId: true,
      escalationLevel: true,
      lastNotifiedAt: true,
      createdAt: true,
    },
  });
  if (pending.length === 0) return { escalated: 0 };

  const hospitalIds = [...new Set(pending.map((p) => p.hospitalId))];
  const specialtyIds = [...new Set(pending.map((p) => p.requestedSpecialtyId))];

  const [configs, hospitals, activeShifts] = await Promise.all([
    prisma.hospitalSpecialty.findMany({
      where: {
        hospitalId: { in: hospitalIds },
        specialtyId: { in: specialtyIds },
      },
      include: { responders: { select: { userId: true } } },
    }),
    prisma.hospital.findMany({
      where: { id: { in: hospitalIds } },
      select: { id: true, directorId: true },
    }),
    prisma.shift.findMany({
      where: {
        endedAt: null,
        hospitalId: { in: hospitalIds },
        specialtyId: { in: specialtyIds },
      },
      select: { userId: true, hospitalId: true, specialtyId: true },
    }),
  ]);

  const cfgKey = (h: string, s: string) => `${h}:${s}`;
  const cfgBy = new Map(configs.map((c) => [cfgKey(c.hospitalId, c.specialtyId), c]));
  const directorBy = new Map(hospitals.map((h) => [h.id, h.directorId]));

  // Specialty members at a hospital as a fallback when no responders are set.
  const memberFallback = new Map<string, string[]>();
  async function membersOf(hospitalId: string, specialtyId: string) {
    const key = cfgKey(hospitalId, specialtyId);
    if (memberFallback.has(key)) return memberFallback.get(key)!;
    const users = await prisma.user.findMany({
      where: {
        specialtyId,
        status: "ATIVO",
        OR: [
          { hospitalId },
          { hospitals: { some: { hospitalId } } },
        ],
      },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    memberFallback.set(key, ids);
    return ids;
  }

  let escalated = 0;

  for (const p of pending) {
    const cfg = cfgBy.get(cfgKey(p.hospitalId, p.requestedSpecialtyId));
    const t = {
      renotifyMin: cfg?.renotifyMin ?? DEFAULTS.renotifyMin,
      secondMin: cfg?.secondMin ?? DEFAULTS.secondMin,
      coordMin: cfg?.coordMin ?? DEFAULTS.coordMin,
      directionMin: cfg?.directionMin ?? DEFAULTS.directionMin,
    };
    const elapsedMin = (now - p.createdAt.getTime()) / 60000;

    // Routing list for this specialty at this hospital.
    const responderIds =
      cfg && cfg.responders.length > 0
        ? cfg.responders.map((r) => r.userId)
        : await membersOf(p.hospitalId, p.requestedSpecialtyId);
    const responderSet = new Set(responderIds);

    // Level 1: responders currently on shift for this specialty.
    const onShift = activeShifts
      .filter(
        (s) =>
          s.hospitalId === p.hospitalId &&
          s.specialtyId === p.requestedSpecialtyId,
      )
      .map((s) => s.userId)
      .filter((id) => responderSet.size === 0 || responderSet.has(id));
    const level1 = onShift.length > 0 ? onShift : responderIds;

    let level = Math.max(p.escalationLevel, 1);
    let lastNotifiedAt = p.lastNotifiedAt;
    let didSomething = false;

    // Especialidades consultoras (CONSULTA) notificam apenas uma vez ao criar
    // e não têm renotificação nem nível 2 — só escalam a coordenador/direção
    // após o prazo longo (configurado, ex.: 7 dias).
    const consulta = cfg?.mode === "CONSULTA";

    if (!consulta) {
      // Re-notify the on-shift group every renotifyMin until accepted.
      const due =
        !lastNotifiedAt ||
        now - lastNotifiedAt.getTime() >= t.renotifyMin * 60000;
      if (due && level1.length > 0) {
        await sendPushToUsers(
          level1,
          parecerPush(p, "Parecer aguardando aceite"),
        );
        lastNotifiedAt = new Date(now);
        didSomething = true;
      }

      // Level 2 — all responders of the specialty at the hospital.
      if (elapsedMin >= t.secondMin && level < 2) {
        await sendPushToUsers(
          responderIds,
          parecerPush(p, "Parecer sem aceite — acionando a especialidade"),
        );
        await writeEvent(p.id, 2);
        level = 2;
        didSomething = true;
      }
    }

    // Level 3 — specialty coordinator.
    if (elapsedMin >= t.coordMin && level < 3) {
      if (cfg?.coordinatorId) {
        await sendPushToUsers(
          [cfg.coordinatorId],
          parecerPush(p, "Escalonamento ao coordenador da especialidade"),
        );
      }
      await writeEvent(p.id, 3);
      level = 3;
      didSomething = true;
    }

    // Level 4 — clinical direction.
    if (elapsedMin >= t.directionMin && level < 4) {
      const directorId = directorBy.get(p.hospitalId);
      if (directorId) {
        await sendPushToUsers(
          [directorId],
          parecerPush(p, "Escalonamento à Direção Clínica"),
        );
      }
      await writeEvent(p.id, 4);
      level = 4;
      didSomething = true;
    }

    if (didSomething) {
      await prisma.parecer.update({
        where: { id: p.id },
        data: { escalationLevel: level, lastNotifiedAt },
      });
      if (level > Math.max(p.escalationLevel, 1)) {
        await audit({
          action: `parecer.escalation.level${level}`,
          entityType: "Parecer",
          entityId: p.id,
        });
        escalated++;
      }
    }
  }

  return { escalated };
}

async function writeEvent(parecerId: string, level: number) {
  await prisma.parecerEvent.create({
    data: { parecerId, type: "ESCALATION", note: LEVEL_NOTE[level] },
  });
}

// Lazy, throttled trigger so escalation advances whenever the app is used —
// no paid scheduler required. At most once per instance per interval.
let lastRun = 0;
const THROTTLE_MS = 60_000;

export async function maybeRunEscalation(): Promise<void> {
  const now = Date.now();
  if (now - lastRun < THROTTLE_MS) return;
  lastRun = now;
  try {
    await runEscalation();
  } catch {
    // best-effort; never block the request it piggybacks on
  }
}
