import "server-only";
import { prisma } from "./db";

export type HospitalOption = { id: string; name: string; city: string | null };

/**
 * Hospitals a user may operate in. Built from the UserHospital memberships,
 * falling back to the user's primary `hospitalId` so accounts created before
 * the multi-hospital join table still resolve to at least one hospital.
 */
export async function listUserHospitals(
  userId: string,
): Promise<HospitalOption[]> {
  const memberships = await prisma.userHospital.findMany({
    where: { userId },
    include: { hospital: { select: { id: true, name: true, city: true } } },
    orderBy: { hospital: { name: "asc" } },
  });

  const byId = new Map<string, HospitalOption>();
  for (const m of memberships) {
    byId.set(m.hospital.id, m.hospital);
  }

  if (byId.size === 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hospital: { select: { id: true, name: true, city: true } } },
    });
    if (user?.hospital) byId.set(user.hospital.id, user.hospital);
  }

  return [...byId.values()];
}

/** True when `hospitalId` is one the user is allowed to operate in. */
export async function userCanUseHospital(
  userId: string,
  hospitalId: string,
): Promise<boolean> {
  const hospitals = await listUserHospitals(userId);
  return hospitals.some((h) => h.id === hospitalId);
}
