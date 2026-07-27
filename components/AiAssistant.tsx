"use client";

import { useState } from "react";
import { Button, Spinner } from "@/components/ui";

type Result = {
  summary: string;
  suggestedQuestions: string[];
  disclaimer: string;
};

export function AiAssistant({ parecerId }: { parecerId: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/pareceres/${parecerId}/ai-summary`, {
        method: "POST",
      });
      if (res.ok) setResult(await res.json());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {!result ? (
        <Button variant="secondary" onClick={run} disabled={busy}>
          {busy ? <Spinner /> : "✨"} Resumir caso com assistente
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
              Resumo
            </p>
            <p className="text-sm leading-relaxed">{result.summary}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
              Perguntas sugeridas
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {result.suggestedQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-fg-muted">
            {result.disclaimer}
          </p>
          <button
            onClick={() => setResult(null)}
            className="text-xs text-primary hover:underline"
          >
            Gerar novamente
          </button>
        </div>
      )}
    </div>
  );
}
