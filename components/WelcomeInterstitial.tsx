"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";

type Notice = {
  title: string;
  body: string;
  category: string;
  urgent: boolean;
  author?: string | null;
  createdAt?: string | null;
};

const SECONDS = 5;

export function WelcomeInterstitial({ notice }: { notice: Notice }) {
  const router = useRouter();
  const [left, setLeft] = useState(SECONDS);

  useEffect(() => {
    const go = () => {
      router.replace("/inicio");
      router.refresh();
    };
    const tick = setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          clearInterval(tick);
          go();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [router]);

  function skip() {
    router.replace("/inicio");
    router.refresh();
  }

  const pct = ((SECONDS - left) / SECONDS) * 100;

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 grid h-20 w-20 place-items-center rounded-3xl border border-primary/25 bg-gradient-to-br from-[#16324a] to-[#0a1120] shadow-[0_0_46px_rgba(60,230,232,0.32)]">
            <LogoMark size={60} />
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-fg-muted">
            Comunicado institucional
          </p>
        </div>

        <div
          className={`rounded-3xl border bg-surface p-6 shadow-lg ${
            notice.urgent ? "border-emergency/50" : "border-line"
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            {notice.urgent ? (
              <span className="rounded-full bg-emergency/15 px-2.5 py-0.5 text-xs font-semibold text-emergency">
                Urgente
              </span>
            ) : null}
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg-muted">
              {notice.category}
            </span>
          </div>
          <h1 className="text-xl font-bold leading-snug">{notice.title}</h1>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg-muted">
            {notice.body}
          </p>
          {notice.author ? (
            <p className="mt-4 text-xs text-fg-muted">— {notice.author}</p>
          ) : null}
        </div>

        <div className="mt-6">
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-fg-muted">
            <span>Indo para o início em {left}s…</span>
            <button
              type="button"
              onClick={skip}
              className="font-medium text-primary hover:underline"
            >
              Continuar agora
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
