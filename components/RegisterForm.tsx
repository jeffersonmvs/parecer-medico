"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Field, Input, Select, Spinner } from "@/components/ui";

type Opt = { id: string; name: string };

export function RegisterForm({
  specialties,
  hospitals,
}: {
  specialties: Opt[];
  hospitals: Opt[];
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          password: fd.get("password"),
          crm: fd.get("crm"),
          specialtyId: fd.get("specialtyId"),
          hospitalId: fd.get("hospitalId"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível concluir o cadastro.");
        return;
      }
      setDone(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-routine/40 bg-routine/10 p-5 text-center">
        <p className="font-semibold text-routine">Cadastro enviado!</p>
        <p className="mt-1 text-sm text-fg-muted">
          Sua conta ficará <b>aguardando liberação</b> pela coordenação. Você
          poderá entrar assim que for aprovada.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome completo" required>
        <Input name="name" placeholder="Seu nome" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail" required>
          <Input name="email" type="email" placeholder="voce@email.com" required />
        </Field>
        <Field label="CRM">
          <Input name="crm" placeholder="CRM-CE 00000" />
        </Field>
      </div>
      <Field label="Senha" required hint="Mínimo de 6 caracteres">
        <Input name="password" type="password" placeholder="••••••••" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hospital" required>
          <Select name="hospitalId" defaultValue="" required>
            <option value="" disabled>Selecione…</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Especialidade" required>
          <Select name="specialtyId" defaultValue="" required>
            <option value="" disabled>Selecione…</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </Field>
      </div>

      {error ? (
        <p className="rounded-xl border border-emergency/40 bg-emergency/10 px-3 py-2 text-sm text-emergency">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Spinner /> : null} Solicitar acesso
      </Button>
      <p className="text-center text-sm text-fg-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
