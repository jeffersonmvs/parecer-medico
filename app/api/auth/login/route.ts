import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  signSession,
  setSessionCookie,
} from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  // Constant-ish messaging: never reveal whether the email exists.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await audit({
      action: "auth.login.failed",
      entityType: "User",
      entityId: user?.id,
      request: req,
    });
    return NextResponse.json(
      { error: "E-mail ou senha incorretos" },
      { status: 401 },
    );
  }

  // Access gating: only released accounts may sign in.
  if (user.status !== "ATIVO") {
    await audit({
      userId: user.id,
      action: `auth.login.blocked.${user.status}`,
      entityType: "User",
      entityId: user.id,
      request: req,
    });
    const msg =
      user.status === "PENDENTE"
        ? "Seu cadastro está aguardando liberação pela coordenação."
        : "Seu acesso foi bloqueado. Procure a administração do PARECER+.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const token = await signSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  await setSessionCookie(token);
  await audit({
    userId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    request: req,
  });

  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role },
  });
}
