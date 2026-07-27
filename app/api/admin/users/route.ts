import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, forbidden, badRequest } from "@/lib/api";
import { can } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ROLES, USER_STATUSES } from "@/lib/constants";

// A readable temporary password the admin can pass along; the account is
// forced to change it on first login.
function tempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[randomInt(chars.length)];
  return `PMed-${out}`;
}

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

const createSchema = z.object({
  name: z.string().min(3).max(120),
  email: z.string().email(),
  crm: z.string().max(40).optional(),
  role: z.enum(ROLES).default("MEDICO_PLANTONISTA"),
  status: z.enum(USER_STATUSES).default("ATIVO"),
  specialtyId: z.string().min(1),
  hospitalId: z.string().min(1),
});

// Admin creates an account directly (e.g. onboarding a list of doctors). A
// temporary password is generated and returned once for the admin to relay.
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!can(auth.user.role, "users.manage")) return forbidden();

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Dados inválidos");
  const d = parsed.data;
  const email = d.email.toLowerCase().trim();

  if (await prisma.user.findUnique({ where: { email } })) {
    return NextResponse.json(
      { error: "Já existe uma conta com este e-mail." },
      { status: 409 },
    );
  }

  const temp = tempPassword();
  const user = await prisma.user.create({
    data: {
      name: d.name.trim(),
      email,
      crm: d.crm?.trim() || null,
      role: d.role,
      status: d.status,
      specialtyId: d.specialtyId,
      hospitalId: d.hospitalId,
      passwordHash: await hashPassword(temp),
      mustChangePassword: true,
      hospitals: { create: { hospitalId: d.hospitalId } },
    },
  });

  await audit({
    userId: auth.user.id,
    action: "users.create",
    entityType: "User",
    entityId: user.id,
    request: req,
  });

  return NextResponse.json({ ok: true, tempPassword: temp, email });
}
