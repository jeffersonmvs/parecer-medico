"use client";

import { useEffect, useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { IconBell, IconCheck } from "@/components/icons";
import {
  currentPushState,
  enablePush,
  isIosNonStandalone,
  type PushState,
} from "@/lib/push-client";

type State = "loading" | PushState;

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    currentPushState().then(setState);
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const st = await enablePush();
      setState(st);
      if (st === "on") setMsg("Notificações ativadas neste dispositivo.");
      else if (st === "blocked")
        setMsg("Permissão bloqueada nas configurações do navegador.");
      else setMsg("Não foi possível ativar as notificações aqui.");
    } catch {
      setMsg("Não foi possível ativar as notificações aqui.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    try {
      await fetch("/api/push/test", { method: "POST" });
      setMsg("Enviado! A notificação deve chegar em instantes.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="text-sm text-fg-muted">
        <Spinner /> Verificando…
      </div>
    );
  }
  if (state === "unsupported") {
    return (
      <p className="text-sm text-fg-muted">
        Este navegador não suporta notificações push.
      </p>
    );
  }
  if (state === "blocked") {
    return (
      <p className="text-sm text-fg-muted">
        Notificações bloqueadas nas permissões do navegador. As notificações são
        essenciais no PARECER+ — habilite-as nas configurações do site para
        receber alertas de pareceres e chamados.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {state === "on" ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-routine">
              <IconCheck size={16} /> Ativadas neste dispositivo
            </span>
            <Button
              variant="ghost"
              onClick={test}
              disabled={busy}
              className="text-sm"
            >
              Enviar teste
            </Button>
          </>
        ) : (
          <Button onClick={enable} disabled={busy}>
            {busy ? <Spinner /> : <IconBell size={18} />} Ativar notificações
          </Button>
        )}
      </div>
      {msg ? <p className="text-xs text-fg-muted">{msg}</p> : null}
      {isIosNonStandalone() ? (
        <p className="text-xs text-fg-muted">
          No iPhone, adicione o app à Tela de Início (Compartilhar › Adicionar à
          Tela de Início) para receber push.
        </p>
      ) : null}
    </div>
  );
}
