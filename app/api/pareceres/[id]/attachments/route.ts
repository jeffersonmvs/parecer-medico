import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, badRequest, notFound } from "@/lib/api";
import { audit } from "@/lib/audit";
import { ATTACHMENT_KINDS, ATTACHMENT_KIND_LABELS } from "@/lib/constants";

// Server-side cap on the stored data URI. Real files are read client-side
// as data URLs and stored inline. In production this endpoint would instead
// receive an S3/Supabase Storage object URL (see README) — kept inline here
// so uploads work end-to-end without extra infrastructure.
const MAX_DATAURL = 2_100_000; // ~1.5 MB file after base64 expansion

const schema = z.object({
  kind: z.enum(ATTACHMENT_KINDS),
  fileName: z.string().min(1).max(200),
  url: z.string().optional(),
  dataUrl: z.string().optional(),
  mimeType: z.string().max(120).optional(),
  size: z.number().int().nonnegative().optional(),
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
  if (!parsed.success) return badRequest("Anexo inválido");
  const { kind, fileName, url, dataUrl, mimeType, size } = parsed.data;

  if (dataUrl) {
    if (!dataUrl.startsWith("data:"))
      return badRequest("Arquivo inválido");
    if (dataUrl.length > MAX_DATAURL)
      return badRequest("Arquivo muito grande (máx. ~1,5 MB nesta demonstração).");
  }
  const storedUrl = dataUrl || url || "#";

  const attachment = await prisma.$transaction(async (tx) => {
    const a = await tx.attachment.create({
      data: {
        parecerId: id,
        kind,
        fileName,
        url: storedUrl,
        mimeType: mimeType || null,
        size: size ?? null,
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
