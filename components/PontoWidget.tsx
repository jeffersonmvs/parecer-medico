"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Card, Button, Spinner } from "@/components/ui";
import { IconClock, IconCheck } from "@/components/icons";
import { formatDuration } from "@/lib/format";

type Status = {
  open: { id: string; startedAt: string; startInside: boolean | null } | null;
  workedTodayMs: number;
  geofenceEnabled: boolean;
  geofenceRadiusM: number | null;
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

export function PontoWidget() {
  const { data, mutate, isLoading } = useSWR<Status>("/api/ponto", fetcher, {
    refreshInterval: 30000,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Atualiza o cronômetro da sessão aberta a cada segundo.
  useEffect(() => {
    if (!data?.open) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [data?.open]);

  async function register(action: "in" | "out") {
    setBusy(true);
    setMsg(null);
    try {
      const pos = await getPosition();
      if (!pos && data?.geofenceEnabled) {
        setMsg(
          "Não foi possível obter sua localização. Ative o GPS/permissão e tente novamente.",
        );
      }
      const res = await fetch("/api/ponto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          lat: pos?.coords.latitude,
          lng: pos?.coords.longitude,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(d.error ?? "Não foi possível registrar.");
        return;
      }
      if (action === "in") {
        setMsg(
          d.inside === false
            ? "Entrada registrada — atenção: fora do perímetro do hospital."
            : "Entrada registrada.",
        );
      } else {
        setMsg(`Saída registrada. Tempo: ${formatDuration(d.workedMs)}.`);
      }
      await mutate();
    } catch {
      setMsg("Falha ao registrar. Tente novamente.");
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

  const open = data.open;
  const elapsed = open
    ? Date.now() - new Date(open.startedAt).getTime()
    : 0;
  // tick só força o re-render; usa-se elapsed calculado acima.
  void tick;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        {open ? (
          <>
            <p className="flex items-center gap-2 font-semibold text-routine">
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-routine" />
              Plantão em andamento
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              Entrada às{" "}
              {new Date(open.startedAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · decorrido <b className="text-fg">{formatDuration(elapsed)}</b>
            </p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              disabled={busy}
              onClick={() => register("out")}
            >
              {busy ? <Spinner /> : <IconClock size={18} />} Registrar saída
            </Button>
          </>
        ) : (
          <>
            <p className="font-semibold">Sem plantão em andamento</p>
            <p className="mt-1 text-sm text-fg-muted">
              Registre a entrada para iniciar a contagem de horas.
            </p>
            <Button
              className="mt-4 w-full"
              disabled={busy}
              onClick={() => register("in")}
            >
              {busy ? <Spinner /> : <IconCheck size={18} />} Registrar entrada
            </Button>
          </>
        )}

        {msg ? (
          <p className="mt-3 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-fg-muted">
            {msg}
          </p>
        ) : null}
      </Card>

      <Card className="flex items-center justify-between p-5">
        <span className="text-sm text-fg-muted">Trabalhado hoje</span>
        <span className="text-lg font-bold">
          {formatDuration(data.workedTodayMs)}
        </span>
      </Card>

      <p className="text-center text-xs text-fg-muted">
        {data.geofenceEnabled
          ? `A localização é conferida no registro (raio de ${data.geofenceRadiusM ?? 150} m do hospital).`
          : "A localização é registrada junto do ponto (conferência por perímetro desligada)."}
      </p>
    </div>
  );
}
