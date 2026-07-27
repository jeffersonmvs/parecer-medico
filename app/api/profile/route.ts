import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, badRequest } from "@/lib/api";
import { audit } from "@/lib/audit";

// Fields a doctor may edit about themselves. Role, status and access are not
// self-editable — those stay with the administration.
const schema = z.object({
  name: z.string().min(3, "Informe seu nome").max(120),
  crm: z.string().max(40).optional().nullable(),
  rqe: z.string().max(40).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  specialtyId: z.string().optional().nullable(),
});

const clean = (v?: string | null) => {
  const t = v?.trim();
  return t ? t : null;
};

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return badRequest("Dados inválidos", parsed.error.flatten().fieldErrors);
  }
  const d = parsed.data;

  // Validate the specialty if one was chosen.
  const specialtyId = clean(d.specialtyId);
  if (specialtyId) {
    const exists = await prisma.specialty.findUnique({
      where: { id: specialtyId },
      select: { id: true },
    });
    if (!exists) return badRequest("Especialidade inválida");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: d.name.trim(),
      crm: clean(d.crm),
      rqe: clean(d.rqe),
      phone: clean(d.phone),
      specialtyId,
    },
    include: { specialty: { select: { id: true, name: true } } },
  });

  await audit({
    userId: user.id,
    action: "profile.update",
    entityType: "User",
    entityId: user.id,
    request: req,
  });

  return NextResponse.json({
    ok: true,
    user: {
      name: updated.name,
      crm: updated.crm,
      rqe: updated.rqe,
      phone: updated.phone,
      specialty: updated.specialty,
    },
  });
}
