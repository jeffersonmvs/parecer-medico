import type { Role } from "./constants";

// A deliberately small permission surface for the MVP. Roles map to
// capabilities; pages and API routes check capabilities, not raw roles,
// so the mapping can evolve without touching call sites.
export type Capability =
  | "parecer.create"
  | "parecer.act" // accept / advance / conclude
  | "parecer.cancelAny"
  | "notice.publish"
  | "dashboard.executive"
  | "escalation.configure"
  | "shift.manageOthers";

const MATRIX: Record<Role, Capability[]> = {
  ADMIN: [
    "parecer.create",
    "parecer.act",
    "parecer.cancelAny",
    "notice.publish",
    "dashboard.executive",
    "escalation.configure",
    "shift.manageOthers",
  ],
  DIRECAO_CLINICA: [
    "parecer.create",
    "parecer.act",
    "parecer.cancelAny",
    "notice.publish",
    "dashboard.executive",
    "escalation.configure",
    "shift.manageOthers",
  ],
  DIRECAO_TECNICA: [
    "notice.publish",
    "dashboard.executive",
    "escalation.configure",
    "shift.manageOthers",
  ],
  COORDENACAO_MEDICA: [
    "parecer.create",
    "parecer.act",
    "notice.publish",
    "dashboard.executive",
    "escalation.configure",
    "shift.manageOthers",
  ],
  COORDENADOR_ESPECIALIDADE: [
    "parecer.create",
    "parecer.act",
    "notice.publish",
    "escalation.configure",
  ],
  MEDICO_ASSISTENTE: ["parecer.create", "parecer.act"],
  MEDICO_PLANTONISTA: ["parecer.create", "parecer.act"],
  RESIDENTE: ["parecer.create", "parecer.act"],
};

export function can(role: string | undefined, cap: Capability): boolean {
  if (!role) return false;
  return MATRIX[role as Role]?.includes(cap) ?? false;
}
