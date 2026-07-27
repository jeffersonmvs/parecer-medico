"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { ChatMessage } from "@/lib/types";
import { Avatar, Spinner } from "@/components/ui";
import { IconSend, IconCheck } from "@/components/icons";
import { formatTime } from "@/lib/format";

export function CaseChat({
  parecerId,
  currentUserId,
}: {
  parecerId: string;
  currentUserId: string;
}) {
  const { data, mutate, isLoading } = useSWR<{ messages: ChatMessage[] }>(
    `/api/pareceres/${parecerId}/messages`,
    fetcher,
    { refreshInterval: 5000 },
  );
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const messages = data?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setText("");
    // optimistic
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      body,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      readAt: null,
      deliveredAt: null,
      sender: { id: currentUserId, name: "Você" },
    };
    mutate({ messages: [...messages, optimistic] }, { revalidate: false });
    try {
      await fetch(`/api/pareceres/${parecerId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      mutate();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[26rem] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-1 py-2">
        {isLoading ? (
          <div className="flex justify-center py-8 text-fg-muted">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">
            Nenhuma mensagem ainda. A conversa fica vinculada a este caso.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
              >
                {!mine ? <Avatar name={m.sender.name} size={28} /> : null}
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "rounded-br-sm bg-primary text-primary-fg"
                      : "rounded-bl-sm bg-surface-2"
                  }`}
                >
                  {!mine ? (
                    <p className="mb-0.5 text-[11px] font-semibold opacity-80">
                      {m.sender.name}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                      mine ? "text-primary-fg/70" : "text-fg-muted"
                    }`}
                  >
                    {formatTime(m.createdAt)}
                    {mine ? (
                      <IconCheck size={12} className={m.readAt ? "opacity-100" : "opacity-50"} />
                    ) : null}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-2 flex items-center gap-2 border-t border-line pt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensagem sobre o caso…"
          className="flex-1 rounded-full border border-line bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-fg transition disabled:opacity-40"
          aria-label="Enviar"
        >
          <IconSend size={18} />
        </button>
      </form>
    </div>
  );
}
