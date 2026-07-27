import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardHeader, Badge } from "@/components/ui";
import { ParecerCard } from "@/components/ParecerCard";
import { NoticeComposer } from "@/components/NoticeComposer";
import {
  IconPlus,
  IconPulse,
  IconArrowRight,
  IconAlert,
} from "@/components/icons";
import { OPEN_STATUSES, NOTICE_CATEGORY_LABELS, type NoticeCategory } from "@/lib/constants";
import { relativeTime } from "@/lib/format";
import { parecerListInclude } from "@/lib/queries";
import type { ParecerListItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const firstName = user.name.replace(/^(Dr[a]?\.?\s*)/i, "").split(" ")[0];

  const [forMe, myShift, notices] = await Promise.all([
    user.specialtyId
      ? prisma.parecer.findMany({
          where: {
            requestedSpecialtyId: user.specialtyId,
            status: { in: OPEN_STATUSES },
          },
          include: parecerListInclude,
          orderBy: { createdAt: "desc" },
          take: 4,
        })
      : Promise.resolve([]),
    prisma.shift.findFirst({ where: { userId: user.id, endedAt: null } }),
    prisma.notice.findMany({
      include: { author: { select: { name: true } } },
      orderBy: [{ urgent: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Olá, {firstName} 👋</h1>
        <p className="text-sm text-fg-muted">
          {myShift
            ? "Você está em plantão e recebendo solicitações."
            : "Você não iniciou o plantão."}
        </p>
      </div>

      {/* Quick actions */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/pareceres/novo"
          className="flex items-center gap-3 rounded-2xl bg-primary p-4 text-primary-fg shadow-sm transition hover:opacity-95"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/20">
            <IconPlus size={24} />
          </span>
          <div>
            <p className="font-semibold">Novo parecer</p>
            <p className="text-sm opacity-80">Solicitar interconsulta</p>
          </div>
        </Link>
        <Link
          href="/plantao"
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-primary/50"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
            <IconPulse size={24} />
          </span>
          <div>
            <p className="font-semibold">
              {myShift ? "Gerenciar plantão" : "Iniciar plantão"}
            </p>
            <p className="text-sm text-fg-muted">Central de plantão</p>
          </div>
        </Link>
      </div>

      {/* Pareceres for my specialty */}
      {user.specialtyId ? (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Para {user.specialty?.name}</h2>
            <Link
              href="/pareceres"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Ver todos <IconArrowRight size={14} />
            </Link>
          </div>
          {forMe.length === 0 ? (
            <Card className="p-6 text-center text-sm text-fg-muted">
              Nenhum parecer pendente para sua especialidade agora.
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(forMe as unknown as ParecerListItem[]).map((p) => (
                <ParecerCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Institutional notices */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Avisos institucionais</h2>
          {can(user.role, "notice.publish") ? <NoticeComposer /> : null}
        </div>
        <div className="space-y-3">
          {notices.map((n) => (
            <Card key={n.id} className="p-4">
              <div className="mb-1 flex items-center gap-2">
                {n.urgent ? (
                  <Badge color="emergency">
                    <IconAlert size={12} /> Urgente
                  </Badge>
                ) : (
                  <Badge color="primary">
                    {NOTICE_CATEGORY_LABELS[n.category as NoticeCategory] ??
                      n.category}
                  </Badge>
                )}
                <span className="ml-auto text-xs text-fg-muted">
                  {relativeTime(n.createdAt)}
                </span>
              </div>
              <h3 className="font-semibold">{n.title}</h3>
              <p className="mt-1 text-sm text-fg-muted">{n.body}</p>
              <p className="mt-2 text-xs text-fg-muted">— {n.author.name}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
