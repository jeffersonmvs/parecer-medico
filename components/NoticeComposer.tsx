"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, Select, Spinner } from "@/components/ui";
import { IconPlus, IconSparkles } from "@/components/icons";
import { NOTICE_CATEGORIES, NOTICE_CATEGORY_LABELS } from "@/lib/constants";

export function NoticeComposer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("COMUNICADO");
  const [urgent, setUrgent] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setBody("");
    setCategory("COMUNICADO");
    setUrgent(false);
    setNote(null);
  }

  async function review() {
    if (!title.trim() || !body.trim()) {
      setNote("Preencha título e conteúdo antes de revisar.");
      return;
    }
    setReviewing(true);
    setNote(null);
    try {
      const res = await fetch("/api/avisos/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNote(data.error ?? "Não foi possível revisar agora.");
        return;
      }
      setTitle(data.title);
      setBody(data.body);
      setNote(
        data.usedAI
          ? "Texto revisado pela IA. Revise e ajuste antes de publicar."
          : "Ajustes de formatação aplicados. Revise antes de publicar.",
      );
    } catch {
      setNote("Não foi possível revisar agora.");
    } finally {
      setReviewing(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category, urgent }),
      });
      if (res.ok) {
        setOpen(false);
        reset();
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
      <Input
        name="title"
        placeholder="Título do aviso"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <Textarea
        name="body"
        rows={3}
        placeholder="Conteúdo…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={review}
          disabled={reviewing || busy}
          className="border border-primary/30 text-primary"
        >
          {reviewing ? <Spinner /> : <IconSparkles size={16} />}
          {reviewing ? "Revisando…" : "Revisar com IA"}
        </Button>
        <span className="text-xs text-fg-muted">
          A IA corrige erros e melhora a apresentação para o corpo clínico.
        </span>
      </div>

      {note ? (
        <p className="rounded-xl border border-primary/25 bg-primary-soft px-3 py-2 text-sm text-primary">
          {note}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="max-w-48"
        >
          {NOTICE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {NOTICE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="urgent"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
            className="accent-[var(--emergency)]"
          />
          Urgente
        </label>
        <div className="ml-auto flex gap-2">
          <Button type="submit" disabled={busy || reviewing}>
            {busy ? <Spinner /> : null} Publicar
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setOpen(false);
              reset();
            }}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
}
