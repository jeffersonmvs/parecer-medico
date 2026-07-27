"use client";

import { useState } from "react";
import { Card, Button, Spinner } from "@/components/ui";
import { IconCheck } from "@/components/icons";

type Config = {
  renotifyAfter: number;
  reassignAfter: number;
  coordinatorAfter: number;
  directorAfter: number;
};
type Item = { id: string; name: string; code: string; config: Config };

const FIELDS: { key: keyof Config; label: string }[] = [
  { key: "renotifyAfter", label: "Renotificar" },
  { key: "reassignAfter", label: "Outros médicos" },
  { key: "coordinatorAfter", label: "Coordenador" },
  { key: "directorAfter", label: "Direção" },
];

export function EscalationSettings({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<{ id: string; msg: string } | null>(
    null,
  );

  function setField(id: string, key: keyof Config, value: number) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, config: { ...it.config, [key]: value } } : it,
      ),
    );
  }

  async function save(item: Item) {
    setSavingId(item.id);
    setErrorId(null);
    setSavedId(null);
    try {
      const res = await fetch(`/api/escalonamento/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.config),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorId({ id: item.id, msg: data.error ?? "Falha ao salvar" });
        return;
      }
      setSavedId(item.id);
      setTimeout(() => setSavedId((s) => (s === item.id ? null : s)), 2500);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-muted">
        Tempos (em minutos) até cada nível de escalonamento de um parecer sem
        aceite. Devem ser crescentes.
      </p>
      {items.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
              {item.code}
            </span>
            <h3 className="font-semibold">{item.name}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="mb-1 block text-xs font-medium text-fg-muted">
                  {f.label}
                </span>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={item.config[f.key]}
                  onChange={(e) =>
                    setField(item.id, f.key, Number(e.target.value))
                  }
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm tabular-nums outline-none focus:border-primary"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button
              onClick={() => save(item)}
              disabled={savingId === item.id}
              className="px-4 py-2 text-sm"
            >
              {savingId === item.id ? <Spinner /> : null} Salvar
            </Button>
            {savedId === item.id ? (
              <span className="inline-flex items-center gap-1 text-sm text-routine">
                <IconCheck size={16} /> Salvo
              </span>
            ) : null}
            {errorId?.id === item.id ? (
              <span className="text-sm text-emergency">{errorId.msg}</span>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
