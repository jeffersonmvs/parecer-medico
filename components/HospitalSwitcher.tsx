"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";
import { IconCheck } from "@/components/icons";

type Hospital = { id: string; name: string; city: string | null };

export function HospitalSwitcher({
  hospitals,
  activeId,
}: {
  hospitals: Hospital[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function select(id: string) {
    if (id === activeId) return;
    setBusy(id);
    try {
      const res = await fetch("/api/auth/select-hospital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId: id }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (hospitals.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-fg-muted">
        Nenhum hospital vinculado à sua conta.
      </p>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {hospitals.map((h) => {
        const active = h.id === activeId;
        return (
          <button
            key={h.id}
            type="button"
            disabled={busy !== null}
            onClick={() => select(h.id)}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
              active
                ? "border-primary bg-primary-soft"
                : "border-line bg-surface-2 hover:border-primary/50"
            } disabled:opacity-60`}
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{h.name}</span>
              {h.city ? (
                <span className="block truncate text-xs text-fg-muted">
                  {h.city}
                </span>
              ) : null}
            </span>
            {busy === h.id ? (
              <Spinner />
            ) : active ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <IconCheck size={16} /> Ativo
              </span>
            ) : (
              <span className="text-xs text-fg-muted">Entrar</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
