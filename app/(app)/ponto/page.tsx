import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PontoWidget } from "@/components/PontoWidget";

export const dynamic = "force-dynamic";

export default async function PontoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Ponto"
        subtitle="Registro de entrada e saída do plantão"
      />
      <PontoWidget />
    </div>
  );
}
