import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { Chamados } from "@/components/Chamados";

export const dynamic = "force-dynamic";

export default async function ChamadosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Chamados Institucionais"
        subtitle="Solicitações rápidas com SLA — UTI, transferências, avaliações"
      />
      <Chamados />
    </div>
  );
}
