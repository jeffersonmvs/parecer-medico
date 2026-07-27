import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState } from "@/components/ui";
import { HospitalConfigurator } from "@/components/HospitalConfigurator";

export const dynamic = "force-dynamic";

export default async function HospitaisPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!can(user.role, "hospital.configure")) {
    return (
      <div>
        <PageHeader title="Configuração de Hospitais" />
        <EmptyState
          title="Sem permissão"
          description="Apenas a administração e a direção clínica podem configurar hospitais."
        />
      </div>
    );
  }

  const hospitals = await prisma.hospital.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true },
  });

  return (
    <div>
      <PageHeader
        title="Configuração de Hospitais"
        subtitle="Especialidades, coordenadores, responsáveis por parecer e direção clínica"
      />
      <HospitalConfigurator
        hospitals={hospitals}
        initialHospitalId={user.activeHospitalId ?? hospitals[0]?.id ?? null}
      />
    </div>
  );
}
