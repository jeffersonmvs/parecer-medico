import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { ExecucaoWidget } from "@/components/ExecucaoWidget";

export const dynamic = "force-dynamic";

export default async function ExecucaoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "execucao.declarar")) redirect("/inicio");

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Execução de plantão"
        subtitle="Declare sua presença no plantão (NUMED)"
      />
      <ExecucaoWidget />
    </div>
  );
}
