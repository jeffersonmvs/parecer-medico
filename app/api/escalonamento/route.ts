import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, forbidden } from "@/lib/api";
import { can } from "@/lib/rbac";

const DEFAULTS = {
  renotifyAfter: 5,
  reassignAfter: 10,
  coordinatorAfter: 20,
  directorAfter: 30,
};

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!can(auth.user.role, "escalation.configure")) return forbidden();

  const specialties = await prisma.specialty.findMany({
    include: { escalation: true },
    orderBy: { name: "asc" },
  });

  const items = specialties.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    config: s.escalation
      ? {
          renotifyAfter: s.escalation.renotifyAfter,
          reassignAfter: s.escalation.reassignAfter,
          coordinatorAfter: s.escalation.coordinatorAfter,
          directorAfter: s.escalation.directorAfter,
        }
      : { ...DEFAULTS },
  }));

  return NextResponse.json({ items });
}
