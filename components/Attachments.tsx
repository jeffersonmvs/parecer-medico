"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select, Input, Spinner } from "@/components/ui";
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
};

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
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AttachmentKind>("LAB");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!fileName.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/pareceres/${parecerId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, fileName: fileName.trim() }),
      });
      setFileName("");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {attachments.length === 0 ? (
        <p className="text-sm text-fg-muted">Nenhum anexo.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
                <IconPaperclip size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.fileName}</p>
                <p className="text-xs text-fg-muted">
                  {ATTACHMENT_KIND_LABELS[a.kind as AttachmentKind] ?? a.kind}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        open ? (
          <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Select
                value={kind}
                onChange={(e) => setKind(e.target.value as AttachmentKind)}
              >
                {ATTACHMENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ATTACHMENT_KIND_LABELS[k]}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="Nome do arquivo (ex.: hemograma.pdf)"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={add} disabled={busy}>
                {busy ? <Spinner /> : null} Adicionar
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <IconPaperclip size={16} /> Anexar exame / documento
          </Button>
        )
      ) : null}
    </div>
  );
}
