import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, badRequest, notFound } from "@/lib/api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const { id } = await params;

  const parecer = await prisma.parecer.findUnique({ where: { id } });
  if (!parecer) return notFound("Parecer não encontrado");

  const messages = await prisma.message.findMany({
    where: { parecerId: id },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Mark others' messages as read by the viewer.
  await prisma.message.updateMany({
    where: { parecerId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ messages });
}

const schema = z.object({
  body: z.string().min(1).max(4000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const { id } = await params;

  const parecer = await prisma.parecer.findUnique({ where: { id } });
  if (!parecer) return notFound("Parecer não encontrado");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Mensagem inválida");

  const now = new Date();
  const message = await prisma.message.create({
    data: {
      parecerId: id,
      senderId: user.id,
      body: parsed.data.body.trim(),
      type: "TEXT",
      deliveredAt: now, // delivered to the server immediately
    },
    include: { sender: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ message }, { status: 201 });
}
