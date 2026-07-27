import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader } from "@/components/ui";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { ParecerActions } from "@/components/ParecerActions";
import { CaseChat } from "@/components/CaseChat";
import { Timeline } from "@/components/Timeline";
import { Attachments } from "@/components/Attachments";
import { AiAssistant } from "@/components/AiAssistant";
import { IconArrowRight } from "@/components/icons";
import { formatDateTime } from "@/lib/format";
import { can } from "@/lib/rbac";
import type { ParecerEvent } from "@/lib/types";

export default async function ParecerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const p = await prisma.parecer.findUnique({
    where: { id },
    include: {
      requestingSpecialty: true,
      requestedSpecialty: true,
      requester: { select: { id: true, name: true, crm: true } },
      assignee: { select: { id: true, name: true, crm: true } },
      attachments: { orderBy: { createdAt: "desc" } },
      events: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!p) notFound();

  const canAct =
    can(user.role, "parecer.cancelAny") ||
    (can(user.role, "parecer.act") &&
      user.specialtyId === p.requestedSpecialtyId);
  const canCancelAny = can(user.role, "parecer.cancelAny");
  const isRequester = p.requesterId === user.id;

  const events: ParecerEvent[] = p.events.map((e) => ({
    id: e.id,
    type: e.type,
    fromStatus: e.fromStatus,
    toStatus: e.toStatus,
    note: e.note,
    location: e.location,
    durationMs: e.durationMs,
    createdAt: e.createdAt.toISOString(),
    user: e.user ? { id: e.user.id, name: e.user.name } : null,
  }));

  return (
    <div>
      <Link
        href="/pareceres"
        className="mb-3 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
      >
        <IconArrowRight size={14} className="rotate-180" /> Pareceres
      </Link>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <PriorityBadge priority={p.priority} />
            <StatusBadge status={p.status} />
            <span className="font-mono text-xs text-fg-muted">{p.code}</span>
          </div>
          <h1 className="text-xl font-bold sm:text-2xl">{p.patientName}</h1>
          <p className="text-sm text-fg-muted">
            Prontuário {p.patientRecord}
            {p.bed ? ` · ${p.bed}` : ""}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold text-primary">
            {p.requestingSpecialty.name}
          </p>
          <p className="text-xs text-fg-muted">solicitou →</p>
          <p className="font-semibold">{p.requestedSpecialty.name}</p>
        </div>
      </div>

      {/* Actions */}
      <Card className="mb-5 p-4">
        <ParecerActions
          parecer={{
            id: p.id,
            status: p.status,
            priority: p.priority,
            requestedSpecialtyId: p.requestedSpecialtyId,
            requesterId: p.requesterId,
          }}
          currentUser={{
            id: user.id,
            specialtyId: user.specialtyId,
            role: user.role,
          }}
          canAct={canAct}
          canCancelAny={canCancelAny}
        />
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Card>
            <CardHeader title="Informações clínicas" />
            <div className="space-y-3 p-4 text-sm">
              <Info label="Hipótese diagnóstica" value={p.diagnosis} />
              <Info label="Motivo da solicitação" value={p.reason} />
              <Info label="Resumo clínico" value={p.clinicalSummary} />
              {p.opinion ? (
                <div className="rounded-xl border border-routine/30 bg-routine/10 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-routine">
                    Parecer realizado
                  </p>
                  <p className="whitespace-pre-wrap">{p.opinion}</p>
                  {p.assignee ? (
                    <p className="mt-2 text-xs text-fg-muted">
                      Assinado eletronicamente por {p.assignee.name}
                      {p.assignee.crm ? ` · ${p.assignee.crm}` : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Assistente clínico"
              subtitle="Organiza o caso — nunca substitui a decisão médica"
            />
            <div className="p-4">
              <AiAssistant parecerId={p.id} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Anexos" subtitle="Exames, imagens e documentos" />
            <div className="p-4">
              <Attachments
                parecerId={p.id}
                attachments={p.attachments.map((a) => ({
                  id: a.id,
                  kind: a.kind,
                  fileName: a.fileName,
                  url: a.url,
                }))}
                canEdit={canAct || isRequester}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Conversa do caso"
              subtitle="Vinculada ao paciente, nunca se perde"
            />
            <div className="px-4 pb-4">
              <CaseChat parecerId={p.id} currentUserId={user.id} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Linha do tempo" />
            <div className="p-4">
              <Timeline events={events} />
              <p className="mt-4 border-t border-line pt-3 text-xs text-fg-muted">
                Solicitado por {p.requester.name}
                {p.requester.crm ? ` · ${p.requester.crm}` : ""} em{" "}
                {formatDateTime(p.createdAt)}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}
