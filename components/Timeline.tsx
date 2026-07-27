import type { ParecerEvent } from "@/lib/types";
import { STATUS_LABELS, type ParecerStatus } from "@/lib/constants";
import { formatDateTime, formatDuration } from "@/lib/format";

function describe(ev: ParecerEvent): string {
  if (ev.type === "STATUS" && ev.toStatus) {
    return `Status: ${STATUS_LABELS[ev.toStatus as ParecerStatus] ?? ev.toStatus}`;
  }
  if (ev.type === "PRIORITY") return ev.note ?? "Prioridade alterada";
  if (ev.type === "ATTACHMENT") return ev.note ?? "Anexo adicionado";
  if (ev.type === "ESCALATION") return ev.note ?? "Escalonamento";
  return ev.note ?? ev.type;
}

const DOT: Record<string, string> = {
  SOLICITADO: "bg-info",
  RECEBIDO: "bg-info",
  ACEITO: "bg-primary",
  EM_ATENDIMENTO: "bg-primary",
  PARECER_REALIZADO: "bg-urgent",
  CONCLUIDO: "bg-routine",
  CANCELADO: "bg-emergency",
};

export function Timeline({ events }: { events: ParecerEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-fg-muted">Sem eventos.</p>;
  }
  return (
    <ol className="relative space-y-4 pl-6">
      <span className="absolute left-[7px] top-1 bottom-1 w-px bg-line" />
      {events.map((ev) => (
        <li key={ev.id} className="relative">
          <span
            className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-surface ${
              (ev.toStatus && DOT[ev.toStatus]) || "bg-fg-muted"
            }`}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="text-sm font-medium">{describe(ev)}</p>
            <time className="text-xs text-fg-muted">
              {formatDateTime(ev.createdAt)}
            </time>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
            {ev.user ? <span>{ev.user.name}</span> : null}
            {ev.location ? <span>· {ev.location}</span> : null}
            {ev.durationMs != null ? (
              <span>· etapa levou {formatDuration(ev.durationMs)}</span>
            ) : null}
          </div>
          {ev.note && ev.type === "STATUS" && ev.note !== "Parecer solicitado" ? (
            <p className="mt-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs">
              {ev.note}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
