import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState } from "@/components/ui";
import { BedsPanel } from "@/components/BedsPanel";

export const dynamic = "force-dynamic";

export default async function LeitosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const beds = user.activeHospitalId
    ? await prisma.bed.findMany({
        where: { hospitalId: user.activeHospitalId },
        orderBy: [{ sector: "asc" }, { unit: "asc" }, { code: "asc" }],
        select: { id: true, sector: true, unit: true, code: true, status: true },
      })
    : [];

  return (
    <div>
      <PageHeader
        title="Painel de Leitos"
        subtitle={`${beds.length} leitos cadastrados${user.activeHospitalName ? ` · ${user.activeHospitalName}` : ""}`}
      />
      {beds.length === 0 ? (
        <EmptyState title="Nenhum leito cadastrado neste hospital" />
      ) : (
        <BedsPanel
          beds={beds}
          canManage={can(user.role, "hospital.configure")}
        />
      )}
    </div>
  );
}
