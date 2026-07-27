import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { PRIORITY_LABELS, type Priority } from "@/lib/constants";

// Computes the current user's attention list on the fly — no stored
// notifications. Two sources: pareceres awaiting the user's specialty, and
// open institutional calls.
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const [pending, openCalls] = await Promise.all([
    user.specialtyId
      ? prisma.parecer.findMany({
          where: {
            requestedSpecialtyId: user.specialtyId,
            status: { in: ["SOLICITADO", "RECEBIDO"] },
          },
          orderBy: [{ escalationLevel: "desc" }, { createdAt: "asc" }],
          take: 15,
        })
      : Promise.resolve([]),
    prisma.institutionalCall.findMany({
      where: { status: "ABERTO" },
      orderBy: { createdAt: "asc" },
      take: 15,
    }),
  ]);

  const items = [
    ...pending.map((p) => ({
      id: `parecer-${p.id}`,
      type: "parecer" as const,
      title: `Parecer aguardando aceite`,
      subtitle: `${p.patientName} · ${PRIORITY_LABELS[p.priority as Priority] ?? p.priority}${
        p.escalationLevel > 0 ? " · escalonado" : ""
      }`,
      href: `/pareceres/${p.id}`,
      urgent: p.priority === "EMERGENCIA" || p.escalationLevel > 0,
    })),
    ...openCalls.map((c) => ({
      id: `call-${c.id}`,
      type: "call" as const,
      title: `Chamado: ${c.type}`,
      subtitle: c.description ?? "Em aberto",
      href: `/chamados`,
      urgent: Date.now() > c.createdAt.getTime() + c.slaMinutes * 60000,
    })),
  ];

  return NextResponse.json({ count: items.length, items });
}
