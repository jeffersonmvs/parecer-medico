// Domain vocabulary. Because SQLite has no native enums, these string
// unions are the single source of truth for the app layer.

export const ROLES = [
  "ADMIN",
  "DIRECAO_CLINICA",
  "DIRECAO_TECNICA",
  "COORDENACAO_MEDICA",
  "COORDENADOR_ESPECIALIDADE",
  "MEDICO_ASSISTENTE",
  "MEDICO_PLANTONISTA",
  "RESIDENTE",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador Geral",
  DIRECAO_CLINICA: "Direção Clínica",
  DIRECAO_TECNICA: "Direção Técnica",
  COORDENACAO_MEDICA: "Coordenação Médica",
  COORDENADOR_ESPECIALIDADE: "Coordenador de Especialidade",
  MEDICO_ASSISTENTE: "Médico Assistente",
  MEDICO_PLANTONISTA: "Médico Plantonista",
  RESIDENTE: "Residente",
};

export const PRIORITIES = ["ROTINA", "URGENTE", "EMERGENCIA"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  ROTINA: "Rotina",
  URGENTE: "Urgente",
  EMERGENCIA: "Emergência",
};

// Target response time per priority, in minutes (drives SLA/heat).
export const PRIORITY_SLA_MINUTES: Record<Priority, number> = {
  ROTINA: 720,
  URGENTE: 60,
  EMERGENCIA: 15,
};

export const PARECER_STATUSES = [
  "SOLICITADO",
  "RECEBIDO",
  "ACEITO",
  "EM_ATENDIMENTO",
  "PARECER_REALIZADO",
  "CONCLUIDO",
  "CANCELADO",
] as const;
export type ParecerStatus = (typeof PARECER_STATUSES)[number];

export const STATUS_LABELS: Record<ParecerStatus, string> = {
  SOLICITADO: "Solicitado",
  RECEBIDO: "Recebido",
  ACEITO: "Aceito",
  EM_ATENDIMENTO: "Em atendimento",
  PARECER_REALIZADO: "Parecer realizado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

// Statuses that still require action from the requested specialty.
export const OPEN_STATUSES: ParecerStatus[] = [
  "SOLICITADO",
  "RECEBIDO",
  "ACEITO",
  "EM_ATENDIMENTO",
  "PARECER_REALIZADO",
];

export const ATTACHMENT_KINDS = [
  "LAB",
  "XRAY",
  "CT",
  "MRI",
  "US",
  "PHOTO",
  "VIDEO",
  "DOC",
] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
  LAB: "Laboratório",
  XRAY: "Radiografia",
  CT: "Tomografia",
  MRI: "Ressonância",
  US: "Ultrassom",
  PHOTO: "Foto",
  VIDEO: "Vídeo",
  DOC: "Documento",
};

export const SHIFT_STATUSES = [
  "AVAILABLE",
  "SURGERY",
  "PROCEDURE",
  "AWAY",
  "RESTING",
  "OFF",
] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  AVAILABLE: "Disponível",
  SURGERY: "Em cirurgia",
  PROCEDURE: "Em procedimento",
  AWAY: "Ausente",
  RESTING: "Em descanso",
  OFF: "Fora do plantão",
};

export const NOTICE_CATEGORIES = [
  "COMUNICADO",
  "PROTOCOLO",
  "ESCALA",
  "TREINAMENTO",
  "URGENTE",
] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

export const NOTICE_CATEGORY_LABELS: Record<NoticeCategory, string> = {
  COMUNICADO: "Comunicado",
  PROTOCOLO: "Protocolo",
  ESCALA: "Escala",
  TREINAMENTO: "Treinamento",
  URGENTE: "Urgente",
};

export function labelForRole(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}

// Institutional calls (chamados rápidos com SLA)
export const CALL_PRESETS: { type: string; sla: number }[] = [
  { type: "Vaga UTI", sla: 30 },
  { type: "Transferência", sla: 60 },
  { type: "Cirurgia Geral", sla: 30 },
  { type: "Ortopedia", sla: 30 },
  { type: "Anestesia", sla: 20 },
  { type: "Avaliação multiprofissional", sla: 120 },
];

export const CALL_STATUSES = ["ABERTO", "ATENDIDO", "CANCELADO"] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  ABERTO: "Aberto",
  ATENDIDO: "Atendido",
  CANCELADO: "Cancelado",
};
