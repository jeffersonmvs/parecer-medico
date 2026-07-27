import "server-only";
import { prisma } from "./db";

/**
 * The doctors who answer pareceres for a specialty at a hospital — the
 * configured responder list, falling back to the specialty's active members
 * when nothing is configured yet.
 */
export async function responderUserIds(
  hospitalId: string,
  specialtyId: string,
): Promise<string[]> {
  const hs = await prisma.hospitalSpecialty.findUnique({
    where: { hospitalId_specialtyId: { hospitalId, specialtyId } },
    include: { responders: { select: { userId: true } } },
  });
  if (hs && hs.responders.length > 0) {
    return hs.responders.map((r) => r.userId);
  }
  const members = await prisma.user.findMany({
    where: {
      specialtyId,
      status: "ATIVO",
      OR: [{ hospitalId }, { hospitals: { some: { hospitalId } } }],
    },
    select: { id: true },
  });
  return members.map((u) => u.id);
}

/**
 * Level-1 escalation targets: responders currently on shift for the specialty.
 * Falls back to the whole responder list when nobody is on shift, so a fresh
 * parecer always reaches someone.
 */
export async function level1Targets(
  hospitalId: string,
  specialtyId: string,
): Promise<string[]> {
  const responders = await responderUserIds(hospitalId, specialtyId);
  const responderSet = new Set(responders);
  const shifts = await prisma.shift.findMany({
    where: { endedAt: null, hospitalId, specialtyId },
    select: { userId: true },
  });
  const onShift = shifts
    .map((s) => s.userId)
    .filter((id) => responderSet.size === 0 || responderSet.has(id));
  return onShift.length > 0 ? onShift : responders;
}
