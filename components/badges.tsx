import { Badge } from "./ui";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  SHIFT_STATUS_LABELS,
  type Priority,
  type ParecerStatus,
  type ShiftStatus,
} from "@/lib/constants";

export function PriorityBadge({ priority }: { priority: string }) {
  const color =
    priority === "EMERGENCIA"
      ? "emergency"
      : priority === "URGENTE"
        ? "urgent"
        : "routine";
  return (
    <Badge color={color}>
      {priority === "EMERGENCIA" ? (
        <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emergency" />
      ) : null}
      {PRIORITY_LABELS[priority as Priority] ?? priority}
    </Badge>
  );
}

const STATUS_COLOR: Record<string, Parameters<typeof Badge>[0]["color"]> = {
  SOLICITADO: "info",
  RECEBIDO: "info",
  ACEITO: "primary",
  EM_ATENDIMENTO: "primary",
  PARECER_REALIZADO: "urgent",
  CONCLUIDO: "routine",
  CANCELADO: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge color={STATUS_COLOR[status] ?? "neutral"}>
      {STATUS_LABELS[status as ParecerStatus] ?? status}
    </Badge>
  );
}

const SHIFT_DOT: Record<string, string> = {
  AVAILABLE: "bg-routine",
  SURGERY: "bg-emergency",
  PROCEDURE: "bg-urgent",
  AWAY: "bg-fg-muted",
  RESTING: "bg-info",
  OFF: "bg-line",
};

export function ShiftStatusDot({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
      <span
        className={`inline-block h-2 w-2 rounded-full ${SHIFT_DOT[status] ?? "bg-line"}`}
      />
      {SHIFT_STATUS_LABELS[status as ShiftStatus] ?? status}
    </span>
  );
}
