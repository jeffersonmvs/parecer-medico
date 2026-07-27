"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Card,
  Button,
  Input,
  Field,
  Select,
  Spinner,
  Badge,
  EmptyState,
} from "@/components/ui";
import { IconCheck, IconUser, IconPlus } from "@/components/icons";
import {
  ROLES,
  ROLE_LABELS,
  USER_STATUSES,
  USER_STATUS_LABELS,
  type Role,
  type UserStatus,
} from "@/lib/constants";

type Specialty = { id: string; name: string; code: string };
type ManagedUser = {
  id: string;
  name: string;
  email: string;
  crm: string | null;
  role: string;
  status: string;
  specialty: Specialty | null;
  hospital: { id: string; name: string } | null;
};

const STATUS_COLOR: Record<string, Parameters<typeof Badge>[0]["color"]> = {
  ATIVO: "routine",
  PENDENTE: "urgent",
  BLOQUEADO: "emergency",
};

const FILTERS = [
  { key: "", label: "Todos" },
  { key: "PENDENTE", label: "Pendentes" },
  { key: "ATIVO", label: "Ativos" },
  { key: "BLOQUEADO", label: "Bloqueados" },
] as const;

export function UserManager({
  specialties,
  hospitals,
}: {
  specialties: Specialty[];
  hospitals: { id: string; name: string }[];
}) {
  const [filter, setFilter] = useState("");
  const { data, mutate, isLoading } = useSWR<{ users: ManagedUser[] }>(
    `/api/admin/users${filter ? `?status=${filter}` : ""}`,
    fetcher,
    { refreshInterval: 15000 },
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreated(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          crm: fd.get("crm"),
          role: fd.get("role"),
          specialtyId: fd.get("specialtyId"),
          hospitalId: fd.get("hospitalId"),
          status: fd.get("status"),
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setCreateError(d.error ?? "Falha ao criar usuário");
        return;
      }
      setCreated({ email: d.email, tempPassword: d.tempPassword });
      (e.target as HTMLFormElement).reset();
      await mutate();
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setSavingId(id);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await mutate();
    } finally {
      setSavingId(null);
    }
  }

  const users = data?.users ?? [];
  const pending = users.filter((u) => u.status === "PENDENTE").length;

  return (
    <div>
      {/* Add doctor */}
      <div className="mb-4">
        {!showAdd ? (
          <Button variant="secondary" onClick={() => { setShowAdd(true); setCreated(null); }}>
            <IconPlus size={16} /> Adicionar médico
          </Button>
        ) : (
          <Card className="p-4">
            <form onSubmit={createUser} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome completo" required>
                  <Input name="name" placeholder="Dr. Fulano de Tal" required />
                </Field>
                <Field label="E-mail" required>
                  <Input name="email" type="email" placeholder="medico@email.com" required />
                </Field>
                <Field label="CRM">
                  <Input name="crm" placeholder="CRM-CE 00000" />
                </Field>
                <Field label="Hospital" required>
                  <Select name="hospitalId" defaultValue={hospitals[0]?.id ?? ""} required>
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Especialidade" required>
                  <Select name="specialtyId" defaultValue="" required>
                    <option value="" disabled>Selecione…</option>
                    {specialties.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Papel">
                  <Select name="role" defaultValue="MEDICO_PLANTONISTA">
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status inicial">
                  <Select name="status" defaultValue="ATIVO">
                    {USER_STATUSES.map((s) => (
                      <option key={s} value={s}>{USER_STATUS_LABELS[s]}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              {createError ? (
                <p className="rounded-lg border border-emergency/40 bg-emergency/10 px-3 py-2 text-sm text-emergency">
                  {createError}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? <Spinner /> : null} Criar conta
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Fechar
                </Button>
              </div>
            </form>
            {created ? (
              <div className="mt-3 rounded-xl border border-routine/40 bg-routine/10 p-3 text-sm">
                <p className="font-semibold text-routine">Conta criada</p>
                <p className="mt-1">
                  <b>{created.email}</b> · senha temporária:{" "}
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono">{created.tempPassword}</code>
                </p>
                <p className="mt-1 text-xs text-fg-muted">
                  Repasse ao médico. Ele terá que trocar a senha no primeiro acesso.
                </p>
              </div>
            ) : null}
          </Card>
        )}
      </div>

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
            {f.key === "PENDENTE" && pending > 0 ? (
              <span className="ml-1.5 rounded-full bg-urgent/20 px-1.5 text-xs text-urgent">
                {pending}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-14 text-fg-muted"><Spinner className="h-6 w-6" /></div>
      ) : users.length === 0 ? (
        <EmptyState icon={<IconUser size={30} />} title="Nenhum usuário neste filtro" />
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id} className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{u.name}</p>
                  <p className="truncate text-xs text-fg-muted">
                    {u.email}
                    {u.crm ? ` · ${u.crm}` : ""}
                    {u.hospital ? ` · ${u.hospital.name}` : ""}
                  </p>
                </div>
                <Badge color={STATUS_COLOR[u.status] ?? "neutral"}>
                  {USER_STATUS_LABELS[u.status as UserStatus] ?? u.status}
                </Badge>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-fg-muted">Papel</span>
                  <Select
                    defaultValue={u.role}
                    onChange={(e) => patch(u.id, { role: e.target.value as Role })}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-fg-muted">Especialidade</span>
                  <Select
                    defaultValue={u.specialty?.id ?? ""}
                    onChange={(e) => patch(u.id, { specialtyId: e.target.value || null })}
                  >
                    <option value="">—</option>
                    {specialties.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-fg-muted">Status</span>
                  <Select
                    value={u.status}
                    onChange={(e) => patch(u.id, { status: e.target.value as UserStatus })}
                  >
                    {USER_STATUSES.map((s) => (
                      <option key={s} value={s}>{USER_STATUS_LABELS[s]}</option>
                    ))}
                  </Select>
                </label>
              </div>

              <div className="mt-3 flex items-center gap-3">
                {u.status === "PENDENTE" ? (
                  <Button
                    onClick={() => patch(u.id, { status: "ATIVO" })}
                    disabled={savingId === u.id}
                    className="px-4 py-2 text-sm"
                  >
                    {savingId === u.id ? <Spinner /> : <IconCheck size={16} />} Liberar acesso
                  </Button>
                ) : null}
                {savingId === u.id ? (
                  <span className="text-xs text-fg-muted">Salvando…</span>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
