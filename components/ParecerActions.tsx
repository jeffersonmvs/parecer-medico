"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea, Spinner } from "@/components/ui";
import { primaryAction } from "@/lib/parecer";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  type ParecerStatus,
} from "@/lib/constants";
import { IconCheck, IconAlert } from "@/components/icons";

type Props = {
  parecer: {
    id: string;
    status: string;
    priority: string;
    requestedSpecialtyId: string;
    requesterId: string;
  };
  currentUser: { id: string; specialtyId: string | null; role: string };
  canAct: boolean;
  canCancelAny: boolean;
};

export function ParecerActions({
  parecer,
  currentUser,
  canAct,
  canCancelAny,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opinion, setOpinion] = useState("");
  const [showOpinion, setShowOpinion] = useState(false);

  const action = primaryAction(parecer.status as ParecerStatus);
  const isTerminal =
    parecer.status === "CONCLUIDO" || parecer.status === "CANCELADO";
  const isRequester = parecer.requesterId === currentUser.id;
  const mayCancel =
    !isTerminal && (isRequester || canAct || canCancelAny);

  async function patch(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pareceres/${parecer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha na operação");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Erro de conexão");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function runPrimary() {
    if (!action) return;
    if (action.to === "PARECER_REALIZADO") {
      setShowOpinion(true);
      return;
    }
    await patch({ action: "transition", to: action.to });
  }

  async function submitOpinion() {
    if (!opinion.trim()) {
      setError("Descreva o parecer.");
      return;
    }
    const ok = await patch({
      action: "transition",
      to: "PARECER_REALIZADO",
      opinion,
    });
    if (ok) setShowOpinion(false);
  }

  if (isTerminal) {
    return (
      <div className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-fg-muted">
        {parecer.status === "CONCLUIDO"
          ? "Este parecer está concluído."
          : "Este parecer foi cancelado."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl border border-emergency/40 bg-emergency/10 px-3 py-2 text-sm text-emergency">
          {error}
        </p>
      ) : null}

      {showOpinion ? (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <Textarea
            autoFocus
            value={opinion}
            onChange={(e) => setOpinion(e.target.value)}
            rows={5}
            placeholder="Descreva o parecer realizado, condutas e recomendações…"
          />
          <div className="mt-2 flex gap-2">
            <Button onClick={submitOpinion} disabled={busy}>
              {busy ? <Spinner /> : <IconCheck size={18} />} Registrar parecer
            </Button>
            <Button variant="ghost" onClick={() => setShowOpinion(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {action && canAct ? (
            <Button onClick={runPrimary} disabled={busy} className="min-w-44">
              {busy ? <Spinner /> : <IconCheck size={18} />} {action.label}
            </Button>
          ) : null}

          {!canAct && !isRequester ? (
            <p className="text-sm text-fg-muted">
              Somente a especialidade solicitada pode dar andamento.
            </p>
          ) : null}

          {mayCancel ? (
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm("Cancelar este parecer?"))
                  patch({ action: "transition", to: "CANCELADO" });
              }}
              disabled={busy}
              className="text-emergency"
            >
              <IconAlert size={16} /> Cancelar
            </Button>
          ) : null}
        </div>
      )}

      {/* Priority quick-change (requester or acting doctor) */}
      {canAct || isRequester ? (
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <span>Prioridade:</span>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              disabled={busy || p === parecer.priority}
              onClick={() => patch({ action: "priority", priority: p })}
              className={`rounded-full border px-2 py-0.5 transition disabled:cursor-default ${
                p === parecer.priority
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-line hover:text-fg"
              }`}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
