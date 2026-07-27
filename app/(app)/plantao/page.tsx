"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Card, CardHeader, Button, Spinner, PageHeader, Avatar } from "@/components/ui";
import { ShiftStatusDot } from "@/components/badges";
import { IconPulse, IconClock } from "@/components/icons";
import {
  SHIFT_STATUSES,
  SHIFT_STATUS_LABELS,
  labelForRole,
  type ShiftStatus,
} from "@/lib/constants";
import { formatDuration } from "@/lib/format";
import type { SpecialtyBoard } from "@/lib/types";
import { useState } from "react";

type BoardResponse = {
  board: SpecialtyBoard[];
  myShift: { id: string; status: string; startedAt: string; specialtyId: string } | null;
  canCheckIn: boolean;
};

export default function PlantaoPage() {
  const { data, mutate, isLoading } = useSWR<BoardResponse>(
    "/api/plantao",
    fetcher,
    { refreshInterval: 6000 },
  );
  const [busy, setBusy] = useState(false);

  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch("/api/plantao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  const board = data?.board ?? [];
  const staffed = board.filter((s) => s.onShift.length > 0);
  const uncovered = board.filter((s) => s.onShift.length === 0 && s.pending > 0);

  return (
    <div>
      <PageHeader
        title="Central de Plantão"
        subtitle="Quem está de plantão, agora, em tempo real"
      />

      {/* My shift */}
      <Card className="mb-5 p-4">
        {!data ? (
          <Spinner />
        ) : data.myShift ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-semibold text-primary">
                <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-routine" />
                Você está em plantão
              </p>
              <p className="mt-0.5 text-sm text-fg-muted">
                Há {formatDuration(Date.now() - new Date(data.myShift.startedAt).getTime())} · recebendo solicitações
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={data.myShift.status}
                onChange={(e) =>
                  act({ action: "status", status: e.target.value })
                }
                disabled={busy}
                className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm"
              >
                {SHIFT_STATUSES.filter((s) => s !== "OFF").map((s) => (
                  <option key={s} value={s}>
                    {SHIFT_STATUS_LABELS[s as ShiftStatus]}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => act({ action: "checkout" })}
              >
                Encerrar plantão
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Você não iniciou o plantão</p>
              <p className="mt-0.5 text-sm text-fg-muted">
                Inicie para passar a receber solicitações de parecer.
              </p>
            </div>
            <Button
              disabled={busy || !data.canCheckIn}
              onClick={() => act({ action: "checkin" })}
              className="min-w-40"
            >
              <IconPulse size={18} /> Iniciar plantão
            </Button>
          </div>
        )}
      </Card>

      {uncovered.length > 0 ? (
        <div className="mb-5 rounded-2xl border border-emergency/40 bg-emergency/10 p-4">
          <p className="text-sm font-semibold text-emergency">
            Especialidades com pendências e sem plantonista ativo
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            {uncovered.map((s) => `${s.name} (${s.pending})`).join(" · ")}
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-16 text-fg-muted">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...staffed, ...board.filter((s) => s.onShift.length === 0 && s.pending === 0)].map(
            (s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                      {s.code}
                    </span>
                    <h3 className="font-semibold">{s.name}</h3>
                  </div>
                  {s.pending > 0 ? (
                    <span className="rounded-full bg-urgent/15 px-2 py-0.5 text-xs font-semibold text-urgent">
                      {s.pending} pendente{s.pending > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2">
                  {s.onShift.length === 0 ? (
                    <p className="text-sm text-fg-muted">Sem plantonista ativo</p>
                  ) : (
                    s.onShift.map((sh) => (
                      <div key={sh.id} className="flex items-center gap-2">
                        <Avatar name={sh.user.name} size={30} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {sh.user.name}
                          </p>
                          <p className="truncate text-[11px] text-fg-muted">
                            {labelForRole(sh.user.role)}
                          </p>
                        </div>
                        <ShiftStatusDot status={sh.status} />
                      </div>
                    ))
                  )}
                </div>

                {s.avgResponseMs != null ? (
                  <p className="mt-3 flex items-center gap-1 border-t border-line pt-2 text-xs text-fg-muted">
                    <IconClock size={13} /> resposta média{" "}
                    {formatDuration(s.avgResponseMs)}
                  </p>
                ) : null}
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}
