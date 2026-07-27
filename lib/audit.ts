import "server-only";
import { prisma } from "./db";

// Append-only audit trail. Every meaningful mutation records who did what,
// from where, and when — the electronic-signature substrate for the spec's
// "assinatura eletrônica baseada no login autenticado".
export async function audit(params: {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  request?: Request;
}): Promise<void> {
  let ip: string | undefined;
  let device: string | undefined;
  if (params.request) {
    const h = params.request.headers;
    ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      undefined;
    device = h.get("user-agent") || undefined;
  }
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ip,
        device,
      },
    });
  } catch {
    // Auditing must never break the primary operation.
  }
}
