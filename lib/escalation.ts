import "server-only";
import { prisma } from "./db";
import { audit } from "./audit";

// Human-readable note recorded on the timeline for each escalation level.
// Levels map to the four configurable thresholds in EscalationConfig.
const LEVEL_NOTE: Record<number, string> = {
  1: "Reenvio de notificação ao plantonista — parecer sem aceite",
  2: "Escalonado: notificados outros médicos da especialidade",
  3: "Escalonado ao Coordenador da especialidade",
  4: "Escalonado à Direção Clínica",
};

// Evaluate every parecer still awaiting acceptance and escalate the ones that
// have crossed a configured threshold. Idempotent: a parecer is only bumped to
// a higher level than it already has, and one timeline event is written per
// newly-crossed level.
export async function runEscalation(): Promise<{ escalated: number }> {
  const now = Date.now();

  const [configs, pending] = await Promise.all([
    prisma.escalationConfig.findMany(),
    prisma.parecer.findMany({
      where: { status: { in: ["SOLICITADO", "RECEBIDO"] } },
    }),
  ]);
  const configBySpec = new Map(configs.map((c) => [c.specialtyId, c]));

  let escalated = 0;
  for (const p of pending) {
    const cfg = configBySpec.get(p.requestedSpecialtyId);
    if (!cfg) continue;

    const elapsedMin = (now - p.createdAt.getTime()) / 60000;
    let target = 0;
    if (elapsedMin >= cfg.directorAfter) target = 4;
    else if (elapsedMin >= cfg.coordinatorAfter) target = 3;
    else if (elapsedMin >= cfg.reassignAfter) target = 2;
    else if (elapsedMin >= cfg.renotifyAfter) target = 1;

    if (target <= p.escalationLevel) continue;

    await prisma.$transaction(async (tx) => {
      await tx.parecer.update({
        where: { id: p.id },
        data: { escalationLevel: target },
      });
      for (let lvl = p.escalationLevel + 1; lvl <= target; lvl++) {
        await tx.parecerEvent.create({
          data: {
            parecerId: p.id,
            type: "ESCALATION",
            note: LEVEL_NOTE[lvl],
          },
        });
      }
    });
    await audit({
      action: `parecer.escalation.level${target}`,
      entityType: "Parecer",
      entityId: p.id,
    });
    escalated++;
  }

  return { escalated };
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
