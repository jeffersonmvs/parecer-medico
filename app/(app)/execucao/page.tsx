import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { ExecucaoWidget } from "@/components/ExecucaoWidget";
import { IconPulse, IconArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ExecucaoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const canDeclare = can(user.role, "execucao.declarar");
  const canView =
    can(user.role, "execucao.homologar") || can(user.role, "execucao.auditar");
  if (!canDeclare && !canView) redirect("/inicio");

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Execução de plantão"
        subtitle="Declare sua presença no plantão (NUMED)"
      />

      {canView ? (
        <Link
          href="/execucao/presentes"
          className="mb-4 flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm font-medium transition hover:border-primary/40"
        >
          <span className="flex items-center gap-2">
            <IconPulse size={18} className="text-primary" /> Painel de presentes
            agora
          </span>
          <IconArrowRight size={18} className="text-fg-muted" />
        </Link>
      ) : null}

      {canDeclare ? (
        <ExecucaoWidget />
      ) : (
        <p className="text-sm text-fg-muted">
          Seu perfil acompanha a execução dos plantões pelo painel de presentes.
        </p>
      )}
    </div>
  );
}
