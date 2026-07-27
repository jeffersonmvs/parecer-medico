"use client";

import { useEffect, useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { IconBell, IconCheck } from "@/components/icons";
import { VAPID_PUBLIC_KEY } from "@/lib/push-public";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "off" | "on" | "blocked";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const showIosHint =
    typeof window !== "undefined" &&
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !(window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error legacy iOS standalone flag
      window.navigator.standalone);

  useEffect(() => {
    if (!supported) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("blocked");
      return;
    }
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, [supported]);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          VAPID_PUBLIC_KEY,
        ) as unknown as BufferSource,
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("subscribe");
      setState("on");
      setMsg("Notificações ativadas neste dispositivo.");
    } catch {
      setMsg("Não foi possível ativar as notificações aqui.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
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
    return <div className="text-sm text-fg-muted"><Spinner /> Verificando…</div>;
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
        Notificações bloqueadas nas permissões do navegador. Habilite-as nas
        configurações do site para receber alertas.
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
            <Button variant="ghost" onClick={test} disabled={busy} className="text-sm">
              Enviar teste
            </Button>
            <Button variant="ghost" onClick={disable} disabled={busy} className="text-sm text-fg-muted">
              Desativar
            </Button>
          </>
        ) : (
          <Button onClick={enable} disabled={busy}>
            {busy ? <Spinner /> : <IconBell size={18} />} Ativar notificações
          </Button>
        )}
      </div>
      {msg ? <p className="text-xs text-fg-muted">{msg}</p> : null}
      {showIosHint ? (
        <p className="text-xs text-fg-muted">
          No iPhone, adicione o app à Tela de Início (Compartilhar › Adicionar à
          Tela de Início) para receber push.
        </p>
      ) : null}
    </div>
  );
}
