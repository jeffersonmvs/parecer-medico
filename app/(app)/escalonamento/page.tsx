import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState } from "@/components/ui";
import { EscalationSettings } from "@/components/EscalationSettings";
import { IconArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  renotifyAfter: 5,
  reassignAfter: 10,
  coordinatorAfter: 20,
  directorAfter: 30,
};

export default async function EscalonamentoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!can(user.role, "escalation.configure")) {
    return (
      <div>
        <PageHeader title="Escalonamento" />
        <EmptyState
          title="Sem permissão"
          description="Apenas coordenação e direção podem configurar os tempos de escalonamento."
        />
      </div>
    );
  }

  const specialties = await prisma.specialty.findMany({
    include: { escalation: true },
    orderBy: { name: "asc" },
  });
  const initial = specialties.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    config: s.escalation
      ? {
          renotifyAfter: s.escalation.renotifyAfter,
          reassignAfter: s.escalation.reassignAfter,
          coordinatorAfter: s.escalation.coordinatorAfter,
          directorAfter: s.escalation.directorAfter,
        }
      : { ...DEFAULTS },
  }));

  return (
    <div>
      <Link
        href="/perfil"
        className="mb-3 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
      >
        <IconArrowRight size={14} className="rotate-180" /> Perfil
      </Link>
      <PageHeader
        title="Configuração de Escalonamento"
        subtitle="Tempos por especialidade até cada nível de escalonamento"
      />
      <EscalationSettings initial={initial} />
    </div>
  );
}
