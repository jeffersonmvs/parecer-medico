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
  "ENFERMEIRA",
  "NUMED",
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
  ENFERMEIRA: "Enfermeira",
  NUMED: "NUMED (Núcleo Médico)",
};

// Turnos e situação do registro de execução de plantão (módulo NUMED).
//
// Quatro turnos possíveis, cada um com hora de início fixa (BRT). O médico
// deve declarar a presença em até 2h após o início da jornada.
//   M  07:00–13:00   (registra até 09:00)
//   T  13:00–19:00   (registra até 15:00)
//   D  07:00–19:00   (registra até 09:00)
//   N  19:00–07:00   (registra até 21:00)
export const TURNOS = ["M", "T", "D", "N"] as const;
export type Turno = (typeof TURNOS)[number];
export const TURNO_LABELS: Record<Turno, string> = {
  M: "Manhã (07h–13h)",
  T: "Tarde (13h–19h)",
  D: "Diurno (07h–19h)",
  N: "Noturno (19h–07h)",
};

// Hora de início/fim (BRT) de cada turno. O fim do noturno cai no dia seguinte.
export const TURNO_START_HOUR: Record<Turno, number> = { M: 7, T: 13, D: 7, N: 19 };
export const TURNO_END_HOUR: Record<Turno, number> = { M: 13, T: 19, D: 19, N: 7 };

// Prazo (em horas) para o médico declarar a presença após o início do turno.
export const DECLARACAO_JANELA_HORAS = 2;

export const MEDICO_ORIGENS = [
  "efetivo",
  "cooperativa",
  "novo_contratado",
  "permuta",
] as const;
export const MEDICO_ORIGEM_LABELS: Record<string, string> = {
  efetivo: "Efetivo",
  cooperativa: "Cooperativa",
  novo_contratado: "Novo contratado",
  permuta: "Permuta",
};

export const PRIORITIES = ["ROTINA", "URGENTE", "EMERGENCIA"] as const;
export type Priority = (typeof PRIORITIES)[number];

// Classificação especial para solicitação de leito de UTI.
export const LEITO_UTI = "LEITO_UTI";

export const PRIORITY_LABELS: Record<string, string> = {
  ROTINA: "Rotina",
  URGENTE: "Urgente",
  EMERGENCIA: "Emergência",
  LEITO_UTI: "UTI / Solicitação de Leito",
};

// Target response time per priority, in minutes (drives SLA/heat).
export const PRIORITY_SLA_MINUTES: Record<string, number> = {
  ROTINA: 720,
  URGENTE: 60,
  EMERGENCIA: 15,
};

// Tipo de resposta de cada especialidade em um hospital.
export const SPECIALTY_MODES = ["URGENCIA", "CONSULTA", "LEITO"] as const;
export type SpecialtyMode = (typeof SPECIALTY_MODES)[number];

export const SPECIALTY_MODE_LABELS: Record<SpecialtyMode, string> = {
  URGENCIA: "Urgência (plantão)",
  CONSULTA: "Consultoria (rotina)",
  LEITO: "UTI / Leito",
};

// Classificações de prioridade permitidas conforme o tipo de resposta.
export function prioritiesForMode(mode: string): string[] {
  if (mode === "CONSULTA") return ["ROTINA"];
  if (mode === "LEITO") return [LEITO_UTI];
  return ["ROTINA", "URGENTE", "EMERGENCIA"];
}

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

// Plantão é binário: o profissional está Disponível (em plantão) ou
// Não disponível (fora do plantão). Sem estados intermediários — o hospital
// não tem como monitorar "em cirurgia", "em procedimento", etc.
export const SHIFT_STATUSES = ["AVAILABLE", "OFF"] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  AVAILABLE: "Disponível",
  OFF: "Não disponível",
};

// Situação do leito no inventário do hospital.
export const BED_STATUSES = ["ATIVO", "MANUTENCAO", "DESATIVADO"] as const;
export type BedStatus = (typeof BED_STATUSES)[number];

export const BED_STATUS_LABELS: Record<BedStatus, string> = {
  ATIVO: "Ativo",
  MANUTENCAO: "Em manutenção",
  DESATIVADO: "Desativado",
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

export const USER_STATUSES = ["ATIVO", "PENDENTE", "BLOQUEADO"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ATIVO: "Ativo",
  PENDENTE: "Aguardando liberação",
  BLOQUEADO: "Bloqueado",
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
