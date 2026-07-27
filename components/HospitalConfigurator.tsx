"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Card,
  CardHeader,
  Button,
  Input,
  Field,
  Select,
  Spinner,
  Badge,
  EmptyState,
} from "@/components/ui";
import { IconPlus, IconCheck, IconHospital } from "@/components/icons";
import { SPECIALTY_MODES, SPECIALTY_MODE_LABELS } from "@/lib/constants";

type Doctor = {
  id: string;
  name: string;
  crm: string | null;
  specialty: { id: string; name: string } | null;
};
type SpecialtyRef = { id: string; name: string; code: string };
type HS = {
  id: string;
  specialtyId: string;
  specialty: SpecialtyRef;
  active: boolean;
  mode: string;
  coordinatorId: string | null;
  renotifyMin: number;
  secondMin: number;
  coordMin: number;
  directionMin: number;
  responderIds: string[];
};
type Config = {
  hospital: { id: string; name: string; directorId: string | null };
  allSpecialties: SpecialtyRef[];
  doctors: Doctor[];
  specialties: HS[];
};

export function HospitalConfigurator({
  hospitals,
  initialHospitalId,
}: {
  hospitals: { id: string; name: string; city: string | null }[];
  initialHospitalId: string | null;
}) {
  const [hospitalId, setHospitalId] = useState<string | null>(initialHospitalId);
  const { data, isLoading, mutate } = useSWR<Config>(
    hospitalId ? `/api/admin/hospitais/${hospitalId}` : null,
    fetcher,
  );

  if (hospitals.length === 0) {
    return <EmptyState title="Nenhum hospital cadastrado" />;
  }

  return (
    <div>
      {hospitals.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {hospitals.map((h) => (
            <button
              key={h.id}
              onClick={() => setHospitalId(h.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                hospitalId === h.id
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-line bg-surface text-fg-muted hover:text-fg"
              }`}
            >
              <IconHospital size={15} /> {h.name}
            </button>
          ))}
        </div>
      ) : null}

      {isLoading || !data ? (
        <div className="flex justify-center py-14 text-fg-muted">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="space-y-5">
          <DirectorCard config={data} onSaved={mutate} />
          <SpecialtiesSection config={data} onChanged={mutate} />
        </div>
      )}
    </div>
  );
}

function DirectorCard({
  config,
  onSaved,
}: {
  config: Config;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(config.hospital.directorId ?? "");

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/admin/hospitais/${config.hospital.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directorId: value || null }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Direção Clínica"
        subtitle="Recebe o 4º nível de escalonamento (90 min sem aceite)"
      />
      <div className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1">
          <Field label="Diretor(a) clínico(a)">
            <Select value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">— Não definido —</option>
              {config.doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Spinner /> : <IconCheck size={16} />} Salvar
        </Button>
      </div>
    </Card>
  );
}

function SpecialtiesSection({
  config,
  onChanged,
}: {
  config: Config;
  onChanged: () => void;
}) {
  const active = new Set(config.specialties.map((s) => s.specialtyId));
  const available = config.allSpecialties.filter((s) => !active.has(s.id));

  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");

  async function addSpecialty(specialtyId: string) {
    if (!specialtyId) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/hospitais/${config.hospital.id}/especialidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialtyId }),
      });
      setAdding("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function createAndAdd() {
    const name = newName.trim();
    if (name.length < 2) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/especialidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await res.json();
      if (res.ok && d.specialty?.id) {
        await addSpecialty(d.specialty.id);
        setNewName("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Card className="mb-4">
        <CardHeader
          title="Adicionar especialidade ao hospital"
          subtitle="Selecione uma existente ou crie uma nova"
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Especialidade existente">
                <Select value={adding} onChange={(e) => setAdding(e.target.value)}>
                  <option value="">Selecione…</option>
                  {available.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button onClick={() => addSpecialty(adding)} disabled={busy || !adding}>
              <IconPlus size={16} /> Adicionar
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Criar nova especialidade">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex.: Clínica médica (Eixo Vermelho)"
                />
              </Field>
            </div>
            <Button variant="secondary" onClick={createAndAdd} disabled={busy || newName.trim().length < 2}>
              Criar
            </Button>
          </div>
        </div>
      </Card>

      {config.specialties.length === 0 ? (
        <EmptyState title="Nenhuma especialidade configurada neste hospital" />
      ) : (
        <div className="space-y-4">
          {config.specialties.map((hs) => (
            <SpecialtyCard
              key={hs.id}
              hs={hs}
              doctors={config.doctors}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpecialtyCard({
  hs,
  doctors,
  onChanged,
}: {
  hs: HS;
  doctors: Doctor[];
  onChanged: () => void;
}) {
  const [coordinatorId, setCoordinatorId] = useState(hs.coordinatorId ?? "");
  const [mode, setMode] = useState(hs.mode ?? "URGENCIA");
  const [responders, setResponders] = useState<Set<string>>(
    new Set(hs.responderIds),
  );
  const [t, setT] = useState({
    renotifyMin: hs.renotifyMin,
    secondMin: hs.secondMin,
    coordMin: hs.coordMin,
    directionMin: hs.directionMin,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(id: string) {
    setResponders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/hospital-especialidades/${hs.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          coordinatorId: coordinatorId || null,
          responderIds: [...responders],
          renotifyMin: t.renotifyMin,
          secondMin: t.secondMin,
          coordMin: t.coordMin,
          directionMin: t.directionMin,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(d.error ?? "Não foi possível salvar.");
        return;
      }
      onChanged();
      setMsg("Configuração salva.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Remover ${hs.specialty.name} deste hospital?`)) return;
    await fetch(`/api/admin/hospital-especialidades/${hs.id}`, {
      method: "DELETE",
    });
    onChanged();
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge color="primary">{hs.specialty.code}</Badge>
          <h3 className="font-bold">{hs.specialty.name}</h3>
        </div>
        <button
          onClick={remove}
          className="text-xs text-fg-muted hover:text-emergency"
        >
          Remover
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Field label="Tipo de resposta">
            <Select value={mode} onChange={(e) => setMode(e.target.value)}>
              {SPECIALTY_MODES.map((m) => (
                <option key={m} value={m}>
                  {SPECIALTY_MODE_LABELS[m]}
                </option>
              ))}
            </Select>
          </Field>
          <p className="mb-3 mt-1 text-[11px] text-fg-muted">
            {mode === "CONSULTA"
              ? "Só “Rotina”; notifica 1x e escala a coordenador/direção pelo prazo abaixo."
              : mode === "LEITO"
                ? "Classificação única “UTI / Solicitação de Leito”."
                : "Rotina / Urgente / Emergência, com escalonamento por minutos."}
          </p>

          <Field label="Coordenador da especialidade">
            <Select
              value={coordinatorId}
              onChange={(e) => setCoordinatorId(e.target.value)}
            >
              <option value="">— Não definido —</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="mt-3">
            <span className="mb-1 block text-xs text-fg-muted">
              Tempos de escalonamento (minutos, crescentes)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <ThresholdInput
                label="Renotificar plantonistas"
                value={t.renotifyMin}
                onChange={(v) => setT((s) => ({ ...s, renotifyMin: v }))}
              />
              <ThresholdInput
                label="Todos da especialidade"
                value={t.secondMin}
                onChange={(v) => setT((s) => ({ ...s, secondMin: v }))}
              />
              <ThresholdInput
                label="Coordenador"
                value={t.coordMin}
                onChange={(v) => setT((s) => ({ ...s, coordMin: v }))}
              />
              <ThresholdInput
                label="Direção clínica"
                value={t.directionMin}
                onChange={(v) => setT((s) => ({ ...s, directionMin: v }))}
              />
            </div>
          </div>
        </div>

        <div>
          <span className="mb-1 block text-xs text-fg-muted">
            Responsáveis acionados no pedido de parecer ({responders.size})
          </span>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-line bg-surface-2 p-2">
            {doctors.length === 0 ? (
              <p className="p-2 text-sm text-fg-muted">
                Nenhum médico vinculado a este hospital.
              </p>
            ) : (
              doctors.map((d) => (
                <label
                  key={d.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface"
                >
                  <input
                    type="checkbox"
                    checked={responders.has(d.id)}
                    onChange={() => toggle(d.id)}
                    className="accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {d.name}
                    {d.specialty ? (
                      <span className="text-fg-muted"> · {d.specialty.name}</span>
                    ) : null}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Spinner /> : <IconCheck size={16} />} Salvar
        </Button>
        {msg ? <span className="text-sm text-fg-muted">{msg}</span> : null}
      </div>
    </Card>
  );
}

function ThresholdInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-fg-muted">{label}</span>
      <Input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
