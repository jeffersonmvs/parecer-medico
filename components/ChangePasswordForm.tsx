"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Field, Input, Spinner } from "@/components/ui";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get("current") || "");
    const newPassword = String(fd.get("new") || "");
    const confirm = String(fd.get("confirm") || "");
    if (newPassword !== confirm) {
      setError("A confirmação não confere com a nova senha.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível alterar a senha.");
        return;
      }
      setDone(true);
      router.push(forced ? "/inicio" : "/perfil");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Senha atual" required>
        <Input name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Nova senha" required hint="Mínimo de 6 caracteres">
        <Input name="new" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirmar nova senha" required>
        <Input name="confirm" type="password" autoComplete="new-password" required />
      </Field>

      {error ? (
        <p className="rounded-xl border border-emergency/40 bg-emergency/10 px-3 py-2 text-sm text-emergency">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading || done}>
        {loading ? <Spinner /> : null} Salvar nova senha
      </Button>
      {!forced ? (
        <p className="text-center text-sm">
          <Link href="/perfil" className="text-fg-muted hover:text-fg">
            Voltar ao perfil
          </Link>
        </p>
      ) : null}
    </form>
  );
}
