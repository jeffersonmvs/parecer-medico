"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Field, Input, Spinner } from "@/components/ui";
import { LogoMark } from "@/components/LogoMark";
import { ThemeToggle } from "@/components/ThemeToggle";

const DEMO = [
  { label: "Direção Clínica", email: "diretoria@hospital.dev" },
  { label: "Coord. Cardiologia", email: "cardio@hospital.dev" },
  { label: "Plantonista Cirurgia", email: "cirurgia@hospital.dev" },
  { label: "Assistente Clínica", email: "clinica@hospital.dev" },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha no login");
        return;
      }
      // Route through the welcome interstitial so any institutional notice is
      // shown briefly before the home screen. An explicit `next` (deep link)
      // still wins.
      const next = params.get("next") || "/bemvindo";
      router.push(next);
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function quickFill(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("plantao123");
    setError(null);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 grid h-24 w-24 place-items-center rounded-3xl border border-primary/25 bg-gradient-to-br from-[#16324a] to-[#0a1120] shadow-[0_0_46px_rgba(60,230,232,0.32)]">
          <LogoMark size={74} />
        </div>
        <h1 className="text-2xl font-bold tracking-wide">
          PARECER<span className="text-primary">+</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-fg-muted">
          Comunicação Clínica Inteligente
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="E-mail" required>
          <Input
            type="email"
            autoComplete="username"
            placeholder="voce@hospital.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Senha" required>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        {error ? (
          <p className="rounded-xl border border-emergency/40 bg-emergency/10 px-3 py-2 text-sm text-emergency">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Spinner /> : null}
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-fg-muted">
        Ainda não tem acesso?{" "}
        <Link href="/registrar" className="font-medium text-primary hover:underline">
          Solicitar cadastro
        </Link>
      </p>

      <div className="mt-6">
        <p className="mb-2 text-center text-xs text-fg-muted">
          Contas de demonstração (senha: plantao123)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => quickFill(d.email)}
              className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-left text-xs font-medium transition hover:border-primary hover:text-primary"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Suspense fallback={<Spinner />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
