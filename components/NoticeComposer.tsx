"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, Select, Spinner } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { NOTICE_CATEGORIES, NOTICE_CATEGORY_LABELS } from "@/lib/constants";

export function NoticeComposer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fd.get("title"),
          body: fd.get("body"),
          category: fd.get("category"),
          urgent: fd.get("urgent") === "on",
        }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <IconPlus size={16} /> Publicar aviso
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-line bg-surface p-4"
    >
      <Input name="title" placeholder="Título do aviso" required />
      <Textarea name="body" rows={3} placeholder="Conteúdo…" required />
      <div className="flex flex-wrap items-center gap-3">
        <Select name="category" defaultValue="COMUNICADO" className="max-w-48">
          {NOTICE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {NOTICE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="urgent" className="accent-[var(--emergency)]" />
          Urgente
        </label>
        <div className="ml-auto flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? <Spinner /> : null} Publicar
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
}
