"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Field, Select, Spinner } from "@/components/ui";
import { IconUser, IconCheck } from "@/components/icons";

type Specialty = { id: string; name: string };

export function ProfileEditor({
  initial,
  specialties,
}: {
  initial: {
    name: string;
    crm: string | null;
    rqe: string | null;
    phone: string | null;
    specialtyId: string | null;
  };
  specialties: Specialty[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          crm: fd.get("crm"),
          rqe: fd.get("rqe"),
          phone: fd.get("phone"),
          specialtyId: fd.get("specialtyId"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      setSaved(true);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="p-4">
        <Button variant="secondary" onClick={() => { setOpen(true); setSaved(false); }}>
          <IconUser size={16} /> Editar meus dados
        </Button>
        {saved ? (
          <p className="mt-2 inline-flex items-center gap-1 text-sm text-routine">
            <IconCheck size={16} /> Dados atualizados.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome completo" required>
          <Input name="name" defaultValue={initial.name} required />
        </Field>
        <Field label="Especialidade">
          <Select name="specialtyId" defaultValue={initial.specialtyId ?? ""}>
            <option value="">—</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="CRM">
          <Input name="crm" defaultValue={initial.crm ?? ""} placeholder="CRM-CE 00000" />
        </Field>
        <Field label="RQE">
          <Input name="rqe" defaultValue={initial.rqe ?? ""} placeholder="Registro de Qualificação de Especialista" />
        </Field>
        <Field label="Telefone / WhatsApp">
          <Input name="phone" defaultValue={initial.phone ?? ""} placeholder="(85) 90000-0000" />
        </Field>
      </div>

      {error ? (
        <p className="rounded-lg border border-emergency/40 bg-emergency/10 px-3 py-2 text-sm text-emergency">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? <Spinner /> : null} Salvar
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
