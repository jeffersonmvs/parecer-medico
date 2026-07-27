"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select, Spinner } from "@/components/ui";
import {
  ATTACHMENT_KINDS,
  ATTACHMENT_KIND_LABELS,
  type AttachmentKind,
} from "@/lib/constants";
import { IconPaperclip } from "@/components/icons";

type Attachment = {
  id: string;
  kind: string;
  fileName: string;
  url: string;
  mimeType?: string | null;
};

const MAX_BYTES = 1_500_000; // ~1.5 MB

function guessKind(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "PHOTO";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime === "application/pdf") return "DOC";
  return "DOC";
}

function isImage(a: Attachment): boolean {
  return (
    (a.mimeType?.startsWith("image/") ?? false) || a.url.startsWith("data:image")
  );
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function Attachments({
  parecerId,
  attachments,
  canEdit,
}: {
  parecerId: string;
  attachments: Attachment[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<AttachmentKind>("LAB");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick() {
    setError(null);
    inputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("Arquivo muito grande (máx. 1,5 MB nesta demonstração).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("read"));
        r.readAsDataURL(file);
      });
      const res = await fetch(`/api/pareceres/${parecerId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: kind || guessKind(file.type),
          fileName: file.name,
          dataUrl,
          mimeType: file.type,
          size: file.size,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Falha no envio");
        return;
      }
      router.refresh();
    } catch {
      setError("Não foi possível ler o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {attachments.length === 0 ? (
        <p className="text-sm text-fg-muted">Nenhum anexo.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {attachments.map((a) => {
            const downloadable = a.url.startsWith("data:") || a.url.startsWith("http");
            const inner = (
              <>
                {isImage(a) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.url}
                    alt={a.fileName}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <IconPaperclip size={17} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.fileName}</p>
                  <p className="text-xs text-fg-muted">
                    {ATTACHMENT_KIND_LABELS[a.kind as AttachmentKind] ?? a.kind}
                  </p>
                </div>
              </>
            );
            return (
              <li key={a.id}>
                {downloadable ? (
                  <a
                    href={a.url}
                    download={a.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2 transition hover:border-primary/50"
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p className="rounded-lg border border-emergency/40 bg-emergency/10 px-3 py-2 text-sm text-emergency">
          {error}
        </p>
      ) : null}

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as AttachmentKind)}
            className="w-44"
          >
            {ATTACHMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {ATTACHMENT_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={pick} disabled={busy}>
            {busy ? <Spinner /> : <IconPaperclip size={16} />} Enviar arquivo
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf,video/*"
            className="hidden"
            onChange={onFile}
          />
          <span className="text-xs text-fg-muted">até 1,5 MB</span>
        </div>
      ) : null}
    </div>
  );
}
