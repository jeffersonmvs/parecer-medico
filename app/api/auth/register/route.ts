import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(3).max(120),
  email: z.string().email(),
  password: z.string().min(6, "Senha muito curta (mín. 6)"),
  crm: z.string().max(40).optional(),
  specialtyId: z.string().min(1),
  hospitalId: z.string().min(1),
});

// Self-registration. New accounts land as PENDENTE and cannot sign in until a
// coordinator/admin releases them in the user-management area.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const email = d.email.toLowerCase().trim();

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json(
      { error: "Já existe uma conta com este e-mail." },
      { status: 409 },
    );
  }

  const [specialty, hospital] = await Promise.all([
    prisma.specialty.findUnique({ where: { id: d.specialtyId } }),
    prisma.hospital.findUnique({ where: { id: d.hospitalId } }),
  ]);
  if (!specialty || !hospital) return NextResponse.json({ error: "Especialidade ou hospital inválido" }, { status: 400 });

  const user = await prisma.user.create({
    data: {
      name: d.name.trim(),
      email,
      crm: d.crm?.trim() || null,
      passwordHash: await hashPassword(d.password),
      role: "MEDICO_PLANTONISTA",
      status: "PENDENTE",
      specialtyId: d.specialtyId,
      hospitalId: d.hospitalId,
      hospitals: { create: { hospitalId: d.hospitalId } },
    },
  });

  await audit({
    userId: user.id,
    action: "auth.register",
    entityType: "User",
    entityId: user.id,
    request: req,
  });

  return NextResponse.json({ ok: true });
}
