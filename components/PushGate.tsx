"use client";

import { useEffect, useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { IconBell } from "@/components/icons";
import {
  currentPushState,
  enablePush,
  isIosNonStandalone,
  pushSupported,
} from "@/lib/push-client";

type Phase =
  | "checking"
  | "hidden"
  | "prompt"
  | "activating"
  | "blocked"
  | "ios-install";

// Key used to avoid nagging within the same session for states the user can
// only resolve outside the app (blocked permission, iOS not installed).
const SNOOZE_KEY = "pm-push-snooze";

export function PushGate() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pushSupported()) {
        setPhase("hidden");
        return;
      }
      if (Notification.permission === "granted") {
        // Permission already given — subscribe silently, no gesture needed.
        try {
          const st = await currentPushState();
          if (st === "on") {
            if (!cancelled) setPhase("hidden");
            return;
          }
          await enablePush();
          if (!cancelled) setPhase("hidden");
        } catch {
          if (!cancelled) setPhase("hidden");
        }
        return;
      }

      const snoozed = sessionStorage.getItem(SNOOZE_KEY) === "1";
      if (Notification.permission === "denied") {
        setPhase(snoozed ? "hidden" : "blocked");
        return;
      }
      if (isIosNonStandalone()) {
        setPhase(snoozed ? "hidden" : "ios-install");
        return;
      }
      setPhase("prompt");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function activate() {
    setPhase("activating");
    setError(null);
    try {
      const st = await enablePush();
      if (st === "on") {
        setPhase("hidden");
      } else if (st === "blocked") {
        setPhase("blocked");
      } else {
        setError("Não foi possível ativar. Tente novamente.");
        setPhase("prompt");
      }
    } catch {
      setError("Não foi possível ativar. Tente novamente.");
      setPhase("prompt");
    }
  }

  function snooze() {
    sessionStorage.setItem(SNOOZE_KEY, "1");
    setPhase("hidden");
  }

  if (phase === "checking" || phase === "hidden") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-primary/30 bg-primary-soft text-primary shadow-[0_0_30px_rgba(60,230,232,0.3)]">
          <IconBell size={30} />
        </div>

        {phase === "ios-install" ? (
          <>
            <h2 className="text-lg font-bold">Ative as notificações</h2>
            <p className="mt-2 text-sm text-fg-muted">
              As notificações são essenciais no PARECER+ para você não perder
              pareceres e chamados. No iPhone, primeiro adicione o app à Tela de
              Início: toque em <b>Compartilhar</b> e depois em{" "}
              <b>Adicionar à Tela de Início</b>. Abra o PARECER+ por lá e ative
              as notificações.
            </p>
            <button
              onClick={snooze}
              className="mt-4 text-sm font-medium text-fg-muted hover:text-fg"
            >
              Entendi
            </button>
          </>
        ) : phase === "blocked" ? (
          <>
            <h2 className="text-lg font-bold">Notificações bloqueadas</h2>
            <p className="mt-2 text-sm text-fg-muted">
              As notificações são essenciais no PARECER+. Elas estão bloqueadas
              nas permissões do navegador/app. Abra as configurações do site e
              permita as notificações para receber alertas de pareceres e
              chamados.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={activate}>Tentar novamente</Button>
              <button
                onClick={snooze}
                className="text-sm font-medium text-fg-muted hover:text-fg"
              >
                Agora não
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold">Ative as notificações</h2>
            <p className="mt-2 text-sm text-fg-muted">
              As notificações são essenciais para o funcionamento do PARECER+.
              Você será avisado imediatamente sobre novos pareceres, respostas e
              chamados da sua equipe.
            </p>
            {error ? (
              <p className="mt-3 rounded-lg border border-emergency/40 bg-emergency/10 px-3 py-2 text-sm text-emergency">
                {error}
              </p>
            ) : null}
            <Button
              onClick={activate}
              disabled={phase === "activating"}
              className="mt-4 w-full"
            >
              {phase === "activating" ? <Spinner /> : <IconBell size={18} />}
              Ativar notificações
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
