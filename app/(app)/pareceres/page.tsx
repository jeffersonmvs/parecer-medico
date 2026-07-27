"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { ParecerListItem } from "@/lib/types";
import { PageHeader, LinkButton, Spinner, EmptyState } from "@/components/ui";
import { ParecerCard } from "@/components/ParecerCard";
import { IconPlus, IconClipboard } from "@/components/icons";
import { cn } from "@/lib/cn";
import { OPEN_STATUSES, PRIORITY_LABELS, PRIORITIES } from "@/lib/constants";

const SCOPES = [
  { key: "forme", label: "Para minha especialidade" },
  { key: "mine", label: "Que eu solicitei" },
  { key: "all", label: "Todos" },
] as const;

export default function PareceresPage() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]["key"]>("forme");
  const [priority, setPriority] = useState<string>("");
  const [onlyOpen, setOnlyOpen] = useState(true);

  const query = new URLSearchParams({ scope });
  if (priority) query.set("priority", priority);

  const { data, isLoading, error } = useSWR<{ pareceres: ParecerListItem[] }>(
    `/api/pareceres?${query.toString()}`,
    fetcher,
    { refreshInterval: 8000 },
  );

  let list = data?.pareceres ?? [];
  if (onlyOpen) list = list.filter((p) => OPEN_STATUSES.includes(p.status as never));

  // Emergency and urgent float to the top within the open set.
  const weight: Record<string, number> = { EMERGENCIA: 0, URGENTE: 1, ROTINA: 2 };
  list = [...list].sort((a, b) => (weight[a.priority] ?? 3) - (weight[b.priority] ?? 3));

  return (
    <div>
      <PageHeader
        title="Pareceres"
        subtitle="Interconsultas e o andamento de cada caso"
        action={
          <LinkButton href="/pareceres/novo" className="hidden md:inline-flex">
            <IconPlus size={18} /> Novo parecer
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
              scope === s.key
                ? "border-primary bg-primary-soft text-primary"
                : "border-line bg-surface text-fg-muted hover:text-fg",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todas as prioridades</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
            className="accent-[var(--primary)]"
          />
          Somente em aberto
        </label>
      </div>

      {error ? (
        <EmptyState title="Erro ao carregar" description={String(error.message)} />
      ) : isLoading ? (
        <div className="flex justify-center py-16 text-fg-muted">
          <Spinner className="h-6 w-6" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<IconClipboard size={32} />}
          title="Nenhum parecer aqui"
          description="Quando houver solicitações neste filtro, elas aparecerão em tempo real."
          action={
            <LinkButton href="/pareceres/novo">
              <IconPlus size={18} /> Solicitar parecer
            </LinkButton>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((p) => (
            <ParecerCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
