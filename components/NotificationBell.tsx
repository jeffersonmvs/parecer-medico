"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { IconBell, IconArrowRight } from "@/components/icons";

type Item = {
  id: string;
  type: "parecer" | "call";
  title: string;
  subtitle: string;
  href: string;
  urgent: boolean;
};

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const { data } = useSWR<{ count: number; items: Item[] }>(
    "/api/notificacoes",
    fetcher,
    { refreshInterval: 10000 },
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const count = data?.count ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface-2 text-fg transition hover:bg-surface"
      >
        <IconBell size={18} />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-emergency px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`absolute top-11 z-30 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="border-b border-line px-4 py-2.5">
            <p className="text-sm font-semibold">Notificações</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-fg-muted">
                Nada pendente por aqui. 🎉
              </p>
            ) : (
              items.map((it) => (
                <Link
                  key={it.id}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 border-b border-line px-4 py-3 transition last:border-0 hover:bg-surface-2"
                >
                  <span
                    className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
                      it.urgent ? "bg-emergency" : "bg-primary"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.title}</p>
                    <p className="truncate text-xs text-fg-muted">
                      {it.subtitle}
                    </p>
                  </div>
                  <IconArrowRight size={14} className="mt-1 text-fg-muted" />
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
