"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  PRIORITY_SLA_MINUTES,
} from "@/lib/constants";

type Specialty = { id: string; name: string; code: string };

export function NewParecerForm({
  specialties,
  ownSpecialtyName,
}: {
  specialties: Specialty[];
  ownSpecialtyName: string | null;
}) {
  const router = useRouter();
  const [priority, setPriority] = useState("URGENTE");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const payload = {
      patientName: String(fd.get("patientName") || ""),
      patientRecord: String(fd.get("patientRecord") || ""),
      bed: String(fd.get("bed") || ""),
      requestedSpecialtyId: String(fd.get("requestedSpecialtyId") || ""),
      diagnosis: String(fd.get("diagnosis") || ""),
      reason: String(fd.get("reason") || ""),
      clinicalSummary: String(fd.get("clinicalSummary") || ""),
      priority,
    };
    try {
      const res = await fetch("/api/pareceres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha ao criar parecer");
        if (data.details) setFieldErrors(data.details);
        return;
      }
      router.push(`/pareceres/${data.parecer.id}`);
      router.refresh();
    } catch {
      setError("Não foi possível enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const err = (name: string) => fieldErrors[name]?.[0];

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Priority — big, thumb-friendly segmented control */}
      <div>
        <span className="mb-2 block text-sm font-medium">
          Classificação de prioridade
        </span>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map((p) => {
            const active = priority === p;
            const tone =
              p === "EMERGENCIA"
                ? "emergency"
                : p === "URGENTE"
                  ? "urgent"
                  : "routine";
            return (
              <button
                type="button"
                key={p}
                onClick={() => setPriority(p)}
                className={cn(
                  "rounded-xl border px-2 py-3 text-center transition",
                  active ? "" : "border-line bg-surface-2 hover:bg-surface",
                )}
                style={
                  active
                    ? {
                        borderColor: `var(--${tone})`,
                        background: `color-mix(in srgb, var(--${tone}) 15%, transparent)`,
                      }
                    : undefined
                }
              >
                <span
                  className="block text-sm font-semibold"
                  style={active ? { color: `var(--${tone})` } : undefined}
                >
                  {PRIORITY_LABELS[p]}
                </span>
                <span className="mt-0.5 block text-[11px] text-fg-muted">
                  meta {PRIORITY_SLA_MINUTES[p]}min
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Especialidade solicitada" required>
          <Select name="requestedSpecialtyId" defaultValue="" required>
            <option value="" disabled>
              Selecione…
            </option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Especialidade solicitante"
          hint="Definida pelo seu perfil"
        >
          <Input value={ownSpecialtyName ?? "—"} disabled />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paciente" required hint={err("patientName")}>
          <Input name="patientName" placeholder="Nome do paciente" required />
        </Field>
        <Field label="Prontuário" required hint={err("patientRecord")}>
          <Input name="patientRecord" placeholder="Nº do prontuário" required />
        </Field>
      </div>

      <Field label="Leito / Localização">
        <Input name="bed" placeholder="Ex.: Enf. 3B - Leito 12" />
      </Field>

      <Field label="Hipótese diagnóstica" required hint={err("diagnosis")}>
        <Input name="diagnosis" placeholder="Ex.: Dor torácica, suspeita de SCA" required />
      </Field>

      <Field label="Motivo da solicitação" required hint={err("reason")}>
        <Input name="reason" placeholder="O que você precisa da especialidade?" required />
      </Field>

      <Field label="Resumo clínico" required hint={err("clinicalSummary")}>
        <Textarea
          name="clinicalSummary"
          rows={5}
          placeholder="História, exame físico, exames relevantes, condutas já tomadas…"
          required
        />
      </Field>

      <p className="text-xs text-fg-muted">
        Anexos (laboratório, imagem, fotos) podem ser adicionados no caso após
        a criação.
      </p>

      {error ? (
        <p className="rounded-xl border border-emergency/40 bg-emergency/10 px-3 py-2 text-sm text-emergency">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
          {loading ? "Enviando…" : "Enviar solicitação"}
        </Button>
      </div>
    </form>
  );
}
