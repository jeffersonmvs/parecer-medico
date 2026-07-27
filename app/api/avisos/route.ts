import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, badRequest, forbidden } from "@/lib/api";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";
import { NOTICE_CATEGORIES } from "@/lib/constants";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const notices = await prisma.notice.findMany({
    include: { author: { select: { id: true, name: true } } },
    orderBy: [{ urgent: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
  return NextResponse.json({ notices });
}

const schema = z.object({
  title: z.string().min(3).max(160),
  body: z.string().min(3).max(4000),
  category: z.enum(NOTICE_CATEGORIES),
  urgent: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  if (!can(user.role, "notice.publish")) return forbidden();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Dados inválidos");

  const notice = await prisma.notice.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category,
      urgent: parsed.data.urgent ?? false,
      authorId: user.id,
    },
    include: { author: { select: { id: true, name: true } } },
  });

  await audit({
    userId: user.id,
    action: "notice.publish",
    entityType: "Notice",
    entityId: notice.id,
    request: req,
  });

  return NextResponse.json({ notice }, { status: 201 });
}
