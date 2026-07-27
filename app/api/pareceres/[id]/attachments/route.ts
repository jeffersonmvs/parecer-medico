import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, badRequest, notFound } from "@/lib/api";
import { audit } from "@/lib/audit";
import { ATTACHMENT_KINDS, ATTACHMENT_KIND_LABELS } from "@/lib/constants";

const schema = z.object({
  kind: z.enum(ATTACHMENT_KINDS),
  fileName: z.string().min(1).max(200),
  url: z.string().optional(),
});

// NOTE: In production files are uploaded to S3-compatible storage and this
// endpoint stores the resulting object URL. For the MVP we store a
// reference so the case timeline and attachment list are fully functional.
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
  if (!parsed.success) return badRequest("Anexo inválido");
  const { kind, fileName, url } = parsed.data;

  const attachment = await prisma.$transaction(async (tx) => {
    const a = await tx.attachment.create({
      data: {
        parecerId: id,
        kind,
        fileName,
        url: url || "#",
        uploadedById: user.id,
      },
    });
    await tx.parecerEvent.create({
      data: {
        parecerId: id,
        type: "ATTACHMENT",
        userId: user.id,
        note: `${ATTACHMENT_KIND_LABELS[kind]}: ${fileName}`,
      },
    });
    return a;
  });

  await audit({
    userId: user.id,
    action: "parecer.attachment.add",
    entityType: "Parecer",
    entityId: id,
    request: req,
  });

  return NextResponse.json({ attachment }, { status: 201 });
}
