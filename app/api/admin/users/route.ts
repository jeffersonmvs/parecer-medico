import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, forbidden } from "@/lib/api";
import { can } from "@/lib/rbac";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!can(auth.user.role, "users.manage")) return forbidden();

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const users = await prisma.user.findMany({
    where: status ? { status } : {},
    include: {
      specialty: { select: { id: true, name: true, code: true } },
      hospital: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      crm: u.crm,
      role: u.role,
      status: u.status,
      specialty: u.specialty,
      hospital: u.hospital,
    })),
  });
}
