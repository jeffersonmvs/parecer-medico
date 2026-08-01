"use client";

import { useMemo, useState } from "react";
import { Card, Button, Spinner } from "@/components/ui";
import { BED_STATUSES, BED_STATUS_LABELS, type BedStatus } from "@/lib/constants";

type Bed = {
  id: string;
  sector: string;
  unit: string;
  code: string;
  status: string;
};

// Cores por situação — desativado em vermelho, manutenção em âmbar, ativo neutro.
const STYLE: Record<string, string> = {
  ATIVO: "border-line bg-surface-2 text-fg",
  MANUTENCAO: "border-amber-500/50 bg-amber-500/15 text-amber-600",
  DESATIVADO: "border-emergency/50 bg-emergency/15 text-emergency line-through",
};

const STATUS_BTN: Record<string, string> = {
  ATIVO: "var(--routine)",
  MANUTENCAO: "#f59e0b",
  DESATIVADO: "var(--emergency)",
};

export function BedsPanel({
  beds: initial,
  canManage,
}: {
  beds: Bed[];
  canManage: boolean;
}) {
  const [beds, setBeds] = useState(initial);
  const [editing, setEditing] = useState<Bed | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("");

  const counts = useMemo(() => {
    const c = { ATIVO: 0, MANUTENCAO: 0, DESATIVADO: 0 } as Record<string, number>;
    for (const b of beds) c[b.status] = (c[b.status] ?? 0) + 1;
    return c;
  }, [beds]);

  // Agrupa por setor → unidade.
  const grouped = useMemo(() => {
    const shown = filter ? beds.filter((b) => b.status === filter) : beds;
    const bySector = new Map<string, Map<string, Bed[]>>();
    for (const b of shown) {
      if (!bySector.has(b.sector)) bySector.set(b.sector, new Map());
      const units = bySector.get(b.sector)!;
      if (!units.has(b.unit)) units.set(b.unit, []);
      units.get(b.unit)!.push(b);
    }
    return bySector;
  }, [beds, filter]);

  async function setStatus(bed: Bed, status: BedStatus) {
    setSaving(true);
    try {
      const res = await fetch(`/api/leitos/${bed.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setBeds((prev) =>
          prev.map((b) => (b.id === bed.id ? { ...b, status } : b)),
        );
        setEditing(null);
      }
    } finally {
      setSaving(false);
    }
  }

  const FILTERS = [
    { key: "", label: `Todos (${beds.length})` },
    { key: "ATIVO", label: `Ativos (${counts.ATIVO})` },
    { key: "MANUTENCAO", label: `Manutenção (${counts.MANUTENCAO})` },
    { key: "DESATIVADO", label: `Desativados (${counts.DESATIVADO})` },
  ];

  return (
    <div>
      {/* Legenda + filtros */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f.key
                ? "border-primary bg-primary-soft text-primary"
                : "border-line bg-surface text-fg-muted hover:text-fg"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-fg-muted">
        <Legend cls="border-line bg-surface-2" label="Ativo" />
        <Legend cls="border-amber-500/50 bg-amber-500/15" label="Em manutenção" />
        <Legend cls="border-emergency/50 bg-emergency/15" label="Desativado" />
        {canManage ? (
          <span className="ml-auto text-fg-muted">
            Toque em um leito para alterar a situação.
          </span>
        ) : null}
      </div>

      <div className="space-y-4">
        {[...grouped.entries()].map(([sector, units]) => {
          const total = [...units.values()].reduce((n, arr) => n + arr.length, 0);
          return (
            <Card key={sector} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">{sector}</h3>
                <span className="text-xs text-fg-muted">{total} leito(s)</span>
              </div>
              <div className="space-y-3">
                {[...units.entries()].map(([unit, list]) => (
                  <div key={unit}>
                    <p className="mb-1.5 text-xs font-medium text-fg-muted">
                      {unit}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((b) => {
                        const cls = STYLE[b.status] ?? STYLE.ATIVO;
                        const chip = (
                          <span
                            className={`inline-flex min-w-9 items-center justify-center rounded-lg border px-2 py-1 text-xs font-semibold ${cls}`}
                          >
                            {b.code}
                          </span>
                        );
                        return canManage ? (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setEditing(b)}
                            title={BED_STATUS_LABELS[b.status as BedStatus]}
                          >
                            {chip}
                          </button>
                        ) : (
                          <span
                            key={b.id}
                            title={BED_STATUS_LABELS[b.status as BedStatus]}
                          >
                            {chip}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal de alteração de situação */}
      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => !saving && setEditing(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-line bg-surface p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-fg-muted">{editing.sector} · {editing.unit}</p>
            <h3 className="mb-1 text-lg font-bold">Leito {editing.code}</h3>
            <p className="mb-4 text-sm text-fg-muted">
              Situação atual:{" "}
              <b>{BED_STATUS_LABELS[editing.status as BedStatus]}</b>
            </p>
            <div className="space-y-2">
              {BED_STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={saving}
                  onClick={() => setStatus(editing, s)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                    editing.status === s
                      ? "border-primary bg-primary-soft"
                      : "border-line bg-surface-2 hover:bg-surface"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: STATUS_BTN[s] }}
                    />
                    {BED_STATUS_LABELS[s]}
                  </span>
                  {saving ? <Spinner /> : null}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              className="mt-3 w-full"
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              Fechar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-4 rounded border ${cls}`} />
      {label}
    </span>
  );
}
