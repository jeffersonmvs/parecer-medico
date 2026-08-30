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
  | "shift.manageOthers"
  | "users.manage"
  | "hospital.configure"
  // Registro de Execução de Plantão (NUMED)
  | "execucao.declarar" // médico declara a própria presença
  | "execucao.confirmar" // enfermeira confirma
  | "execucao.homologar" // coordenador/direção homologa
  | "execucao.auditar"; // NUMED audita / fecha o mês

const MATRIX: Record<Role, Capability[]> = {
  ADMIN: [
    "parecer.create",
    "parecer.act",
    "parecer.cancelAny",
    "notice.publish",
    "dashboard.executive",
    "escalation.configure",
    "shift.manageOthers",
    "users.manage",
    "hospital.configure",
    "execucao.declarar",
    "execucao.confirmar",
    "execucao.homologar",
    "execucao.auditar",
  ],
  DIRECAO_CLINICA: [
    "parecer.create",
    "parecer.act",
    "parecer.cancelAny",
    "notice.publish",
    "dashboard.executive",
    "escalation.configure",
    "shift.manageOthers",
    "hospital.configure",
    "execucao.homologar",
    "execucao.auditar",
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
    "execucao.declarar",
    "execucao.homologar",
  ],
  MEDICO_ASSISTENTE: ["parecer.create", "parecer.act", "execucao.declarar"],
  MEDICO_PLANTONISTA: ["parecer.create", "parecer.act", "execucao.declarar"],
  RESIDENTE: ["parecer.create", "parecer.act", "execucao.declarar"],
  ENFERMEIRA: ["execucao.confirmar"],
  NUMED: ["dashboard.executive", "execucao.auditar", "execucao.homologar"],
};

export function can(role: string | undefined, cap: Capability): boolean {
  if (!role) return false;
  return MATRIX[role as Role]?.includes(cap) ?? false;
}
