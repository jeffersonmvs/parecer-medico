import type { ParecerStatus } from "./constants";

// Allowed forward transitions of the parecer workflow. CANCELADO is
// reachable from any open state and is handled separately.
const TRANSITIONS: Record<ParecerStatus, ParecerStatus[]> = {
  SOLICITADO: ["RECEBIDO", "ACEITO", "CANCELADO"],
  RECEBIDO: ["ACEITO", "CANCELADO"],
  ACEITO: ["EM_ATENDIMENTO", "CANCELADO"],
  EM_ATENDIMENTO: ["PARECER_REALIZADO", "CANCELADO"],
  PARECER_REALIZADO: ["CONCLUIDO", "CANCELADO"],
  CONCLUIDO: [],
  CANCELADO: [],
};

export function canTransition(
  from: ParecerStatus,
  to: ParecerStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatuses(from: ParecerStatus): ParecerStatus[] {
  return TRANSITIONS[from] ?? [];
}

// The primary action label a doctor sees for a given state — keeps the
// "max three taps" promise by surfacing the single obvious next step.
export function primaryAction(
  status: ParecerStatus,
): { to: ParecerStatus; label: string } | null {
  switch (status) {
    case "SOLICITADO":
    case "RECEBIDO":
      return { to: "ACEITO", label: "Aceitar parecer" };
    case "ACEITO":
      return { to: "EM_ATENDIMENTO", label: "Iniciar atendimento" };
    case "EM_ATENDIMENTO":
      return { to: "PARECER_REALIZADO", label: "Registrar parecer" };
    case "PARECER_REALIZADO":
      return { to: "CONCLUIDO", label: "Concluir" };
    default:
      return null;
  }
}

// Generate a human-facing ticket code from a monotonic count.
export function ticketCode(sequence: number): string {
  return `PAR-${String(sequence).padStart(6, "0")}`;
}
