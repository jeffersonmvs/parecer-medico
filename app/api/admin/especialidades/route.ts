import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, forbidden, badRequest } from "@/lib/api";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!can(auth.user.role, "hospital.configure")) return forbidden();

  const specialties = await prisma.specialty.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
  return NextResponse.json({ specialties });
}

const schema = z.object({
  name: z.string().min(2).max(80),
  code: z.string().min(2).max(12).optional(),
});

function codeFrom(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
  return (base.slice(0, 3) || "ESP").padEnd(3, "X");
}

// Create a global specialty (many HMJEH specialties are not seeded yet).
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!can(auth.user.role, "hospital.configure")) return forbidden();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Dados inválidos");
  const name = parsed.data.name.trim();

  if (await prisma.specialty.findUnique({ where: { name } })) {
    return NextResponse.json(
      { error: "Já existe uma especialidade com este nome." },
      { status: 409 },
    );
  }

  // Ensure a unique code.
  let code = (parsed.data.code?.trim() || codeFrom(name)).toUpperCase();
  let n = 1;
  while (await prisma.specialty.findUnique({ where: { code } })) {
    code = `${codeFrom(name).slice(0, 2)}${n++}`;
  }

  const specialty = await prisma.specialty.create({
    data: { name, code },
    select: { id: true, name: true, code: true },
  });
  await audit({
    userId: auth.user.id,
    action: "specialty.create",
    entityType: "Specialty",
    entityId: specialty.id,
    request: req,
  });

  return NextResponse.json({ specialty }, { status: 201 });
}
