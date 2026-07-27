"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Card, Button, Select, Spinner, Badge, EmptyState } from "@/components/ui";
import { IconCheck, IconUser } from "@/components/icons";
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

export function UserManager({ specialties }: { specialties: Specialty[] }) {
  const [filter, setFilter] = useState("");
  const { data, mutate, isLoading } = useSWR<{ users: ManagedUser[] }>(
    `/api/admin/users${filter ? `?status=${filter}` : ""}`,
    fetcher,
    { refreshInterval: 15000 },
  );
  const [savingId, setSavingId] = useState<string | null>(null);

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
