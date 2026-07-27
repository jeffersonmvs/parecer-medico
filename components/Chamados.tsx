"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { InstitutionalCall } from "@/lib/types";
import {
  Card,
  Button,
  Input,
  Select,
  Spinner,
  EmptyState,
  Badge,
} from "@/components/ui";
import { IconPlus, IconCheck, IconAlert, IconClock } from "@/components/icons";
import { CALL_PRESETS, CALL_STATUS_LABELS, type CallStatus } from "@/lib/constants";
import { relativeTime, formatDuration } from "@/lib/format";

function slaState(call: InstitutionalCall) {
  const deadline = new Date(call.createdAt).getTime() + call.slaMinutes * 60000;
  const remaining = deadline - Date.now();
  const overdue = remaining < 0;
  const pct = Math.min(
    100,
    Math.max(
      0,
      ((Date.now() - new Date(call.createdAt).getTime()) /
        (call.slaMinutes * 60000)) *
        100,
    ),
  );
  return { remaining, overdue, pct };
}

export function Chamados() {
  const { data, mutate, isLoading } = useSWR<{ calls: InstitutionalCall[] }>(
    "/api/chamados",
    fetcher,
    { refreshInterval: 8000 },
  );
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState(false);

  async function create(type: string, slaMinutes: number, description?: string) {
    setBusy(true);
    try {
      await fetch("/api/chamados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, slaMinutes, description }),
      });
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  async function act(id: string, action: "attend" | "cancel") {
    await fetch(`/api/chamados/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await mutate();
  }

  const calls = data?.calls ?? [];
  const open = calls.filter((c) => c.status === "ABERTO");
  const resolved = calls.filter((c) => c.status !== "ABERTO").slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Quick create */}
      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold">Abrir chamado rápido</p>
        <div className="flex flex-wrap gap-2">
          {CALL_PRESETS.map((p) => (
            <button
              key={p.type}
              disabled={busy}
              onClick={() => create(p.type, p.sla)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm font-medium transition hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <IconPlus size={15} /> {p.type}
              <span className="text-[11px] text-fg-muted">SLA {p.sla}m</span>
            </button>
          ))}
          <button
            onClick={() => setCustom((v) => !v)}
            className="rounded-xl border border-dashed border-line px-3 py-2 text-sm text-fg-muted hover:text-fg"
          >
            Outro…
          </button>
        </div>

        {custom ? (
          <form
            className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const type = String(fd.get("type") || "").trim();
              const sla = Number(fd.get("sla") || 30);
              if (type) create(type, sla, String(fd.get("desc") || ""));
              (e.currentTarget as HTMLFormElement).reset();
            }}
          >
            <Input name="type" placeholder="Tipo do chamado" required />
            <Select name="sla" defaultValue="30" className="w-28">
              <option value="15">SLA 15m</option>
              <option value="30">SLA 30m</option>
              <option value="60">SLA 60m</option>
              <option value="120">SLA 120m</option>
            </Select>
            <Button type="submit" disabled={busy}>
              Abrir
            </Button>
          </form>
        ) : null}
      </Card>

      {/* Open calls */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">Em aberto</h2>
          <span className="text-sm text-fg-muted">{open.length}</span>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10 text-fg-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : open.length === 0 ? (
          <EmptyState
            icon={<IconCheck size={30} />}
            title="Nenhum chamado em aberto"
            description="Os chamados rápidos com SLA aparecem aqui em tempo real."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {open.map((c) => {
              const { remaining, overdue, pct } = slaState(c);
              return (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{c.type}</p>
                      {c.description ? (
                        <p className="mt-0.5 text-sm text-fg-muted">
                          {c.description}
                        </p>
                      ) : null}
                    </div>
                    {overdue ? (
                      <Badge color="emergency">
                        <IconAlert size={12} /> SLA vencido
                      </Badge>
                    ) : (
                      <Badge color="routine">
                        <IconClock size={12} /> {formatDuration(remaining)}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: overdue
                          ? "var(--emergency)"
                          : pct > 66
                            ? "var(--urgent)"
                            : "var(--routine)",
                      }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-fg-muted">
                      {c.requester.name} · {relativeTime(c.createdAt)}
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        variant="secondary"
                        onClick={() => act(c.id, "attend")}
                        className="px-3 py-1.5 text-xs"
                      >
                        <IconCheck size={14} /> Atender
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => act(c.id, "cancel")}
                        className="px-3 py-1.5 text-xs text-fg-muted"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved */}
      {resolved.length > 0 ? (
        <div>
          <h2 className="mb-2 font-bold">Recentes</h2>
          <div className="space-y-2">
            {resolved.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              >
                <span>
                  {c.type}
                  <span className="ml-2 text-xs text-fg-muted">
                    {c.requester.name}
                  </span>
                </span>
                <Badge color={c.status === "ATENDIDO" ? "routine" : "neutral"}>
                  {CALL_STATUS_LABELS[c.status as CallStatus] ?? c.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
