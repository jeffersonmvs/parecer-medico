"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Card, Button, Spinner, Badge } from "@/components/ui";
import { IconCheck, IconClock } from "@/components/icons";

type TodayPresence = {
  sectorId: string;
  sectorName: string;
  turno: string;
  turnoLabel: string;
  selfAt: string | null;
  selfInside: boolean | null;
  nurseConfirmed: boolean | null;
  coordConfirmed: boolean | null;
  status: string;
};

type Data = {
  enrolled: boolean;
  doctorName?: string;
  sectors: { id: string; name: string }[];
  turno: "D" | "N";
  geofenceEnabled?: boolean;
  geofenceRadiusM?: number | null;
  today: TodayPresence[];
};

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

function StageBadge({
  done,
  label,
}: {
  done: boolean | null | undefined;
  label: string;
}) {
  return (
    <span
      className={
        done
          ? "inline-flex items-center gap-1 text-routine"
          : "inline-flex items-center gap-1 text-fg-muted"
      }
    >
      <span
        className={
          "inline-block h-1.5 w-1.5 rounded-full " +
          (done ? "bg-routine" : "bg-line")
        }
      />
      {label}
    </span>
  );
}

export function ExecucaoWidget() {
  const { data, mutate, isLoading } = useSWR<Data>("/api/execucao", fetcher);
  const [sectorId, setSectorId] = useState("");
  const [turno, setTurno] = useState<"D" | "N">("D");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Pré-seleciona o setor único e o turno provável quando os dados chegam.
  useEffect(() => {
    if (!data) return;
    setTurno(data.turno);
    if (data.sectors.length === 1) setSectorId(data.sectors[0].id);
  }, [data]);

  async function declare() {
    if (!sectorId) {
      setMsg({ ok: false, text: "Selecione o setor do plantão." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const pos = await getPosition();
      const res = await fetch("/api/execucao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectorId,
          turno,
          lat: pos?.coords.latitude,
          lng: pos?.coords.longitude,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: d.error ?? "Não foi possível registrar." });
        return;
      }
      const loc =
        d.inside === false
          ? " (atenção: fora do perímetro do hospital)"
          : "";
      setMsg({
        ok: true,
        text: `Presença declarada — ${d.sectorName}, ${d.turnoLabel}${loc}. Aguardando confirmação da enfermeira.`,
      });
      await mutate();
    } catch {
      setMsg({ ok: false, text: "Falha ao registrar. Tente novamente." });
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !data) {
    return (
      <Card className="p-6">
        <div className="flex justify-center text-fg-muted">
          <Spinner className="h-6 w-6" />
        </div>
      </Card>
    );
  }

  if (!data.enrolled) {
    return (
      <Card className="p-5">
        <p className="font-semibold">Cadastro pendente</p>
        <p className="mt-1 text-sm text-fg-muted">
          Seu usuário ainda não está vinculado à escala de plantonistas do
          NUMED. Procure o NUMED do hospital para concluir o cadastro e passar a
          declarar seus plantões por aqui.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <p className="font-semibold">Declarar presença no plantão</p>
        <p className="mt-1 text-sm text-fg-muted">
          Informe que você está no plantão. A enfermeira do setor confirma e o
          coordenador homologa no dia seguinte.
        </p>

        <label className="mt-4 block text-xs font-medium text-fg-muted">
          Setor
        </label>
        <select
          className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm"
          value={sectorId}
          onChange={(e) => setSectorId(e.target.value)}
        >
          <option value="">Selecione…</option>
          {data.sectors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs font-medium text-fg-muted">
          Turno
        </label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(["D", "N"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTurno(t)}
              className={
                "rounded-xl border px-3 py-2.5 text-sm font-medium transition " +
                (turno === t
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-line bg-surface-2 text-fg-muted")
              }
            >
              {t === "D" ? "Diurno" : "Noturno"}
            </button>
          ))}
        </div>

        <Button className="mt-4 w-full" disabled={busy} onClick={declare}>
          {busy ? <Spinner /> : <IconCheck size={18} />} Estou presente
        </Button>

        {msg ? (
          <p
            className={
              "mt-3 rounded-xl border px-3 py-2 text-sm " +
              (msg.ok
                ? "border-routine/40 bg-routine/10 text-fg"
                : "border-line bg-surface-2 text-fg-muted")
            }
          >
            {msg.text}
          </p>
        ) : null}
      </Card>

      <Card className="p-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <IconClock size={16} className="text-primary" /> Hoje
        </p>
        {data.today.length === 0 ? (
          <p className="mt-2 text-sm text-fg-muted">
            Nenhuma presença declarada hoje.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.today.map((p) => (
              <li
                key={p.sectorId + p.turno}
                className="rounded-xl border border-line bg-surface-2 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.sectorName}</span>
                  <Badge color="neutral">{p.turnoLabel}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <StageBadge done={p.selfAt != null} label="Declarado" />
                  <StageBadge done={p.nurseConfirmed} label="Enfermeira" />
                  <StageBadge done={p.coordConfirmed} label="Coordenador" />
                </div>
                {p.selfInside === false ? (
                  <p className="mt-2 text-xs text-urgent">
                    Declarado fora do perímetro do hospital.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-center text-xs text-fg-muted">
        {data.geofenceEnabled
          ? `Sua localização é registrada junto da declaração (raio de ${data.geofenceRadiusM ?? 150} m do hospital).`
          : "Sua localização é registrada junto da declaração."}
      </p>
    </div>
  );
}
