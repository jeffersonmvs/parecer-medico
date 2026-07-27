import Link from "next/link";
import type { ParecerListItem } from "@/lib/types";
import { PriorityBadge, StatusBadge } from "./badges";
import { relativeTime } from "@/lib/format";
import { IconChat, IconPaperclip, IconClock } from "./icons";

export function ParecerCard({ p }: { p: ParecerListItem }) {
  const emergency = p.priority === "EMERGENCIA" && p.status === "SOLICITADO";
  return (
    <Link
      href={`/pareceres/${p.id}`}
      className={`block rounded-2xl border bg-surface p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md ${
        emergency ? "border-emergency/50 animate-pulse-ring" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={p.priority} />
          <StatusBadge status={p.status} />
        </div>
        <span className="font-mono text-[11px] text-fg-muted">{p.code}</span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
          {p.requestingSpecialty.code}
        </span>
        <span className="text-fg-muted">→</span>
        <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-xs font-semibold">
          {p.requestedSpecialty.code}
        </span>
      </div>

      <p className="mt-2 truncate font-semibold">{p.patientName}</p>
      <p className="truncate text-sm text-fg-muted">{p.diagnosis}</p>
      {p.bed ? (
        <p className="mt-0.5 truncate text-xs text-fg-muted">{p.bed}</p>
      ) : null}

      <div className="mt-3 flex items-center gap-4 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-1">
          <IconClock size={14} /> {relativeTime(p.createdAt)}
        </span>
        {p._count.messages > 0 ? (
          <span className="inline-flex items-center gap-1">
            <IconChat size={14} /> {p._count.messages}
          </span>
        ) : null}
        {p._count.attachments > 0 ? (
          <span className="inline-flex items-center gap-1">
            <IconPaperclip size={14} /> {p._count.attachments}
          </span>
        ) : null}
        {p.assignee ? (
          <span className="ml-auto truncate">{p.assignee.name}</span>
        ) : null}
      </div>
    </Link>
  );
}
