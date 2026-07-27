import { Badge } from "./ui";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  SHIFT_STATUS_LABELS,
  type ParecerStatus,
} from "@/lib/constants";

export function PriorityBadge({ priority }: { priority: string }) {
  const color =
    priority === "EMERGENCIA"
      ? "emergency"
      : priority === "URGENTE"
        ? "urgent"
        : priority === "LEITO_UTI"
          ? "info"
          : "routine";
  return (
    <Badge color={color}>
      {priority === "EMERGENCIA" ? (
        <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emergency" />
      ) : null}
      {PRIORITY_LABELS[priority] ?? priority}
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

export function ShiftStatusDot({ status }: { status: string }) {
  // Binary: anything other than OFF means the professional is on shift.
  const off = status === "OFF";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
      <span
        className={`inline-block h-2 w-2 rounded-full ${off ? "bg-line" : "bg-routine"}`}
      />
      {off ? SHIFT_STATUS_LABELS.OFF : SHIFT_STATUS_LABELS.AVAILABLE}
    </span>
  );
}
