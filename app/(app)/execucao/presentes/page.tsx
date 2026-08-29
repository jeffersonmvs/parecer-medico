import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { PresentesBoard } from "@/components/PresentesBoard";

export const dynamic = "force-dynamic";

export default async function PresentesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canView =
    can(user.role, "execucao.homologar") || can(user.role, "execucao.auditar");
  if (!canView) redirect("/inicio");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Presentes agora"
        subtitle="Plantonistas em turno com presença declarada"
      />
      <PresentesBoard />
    </div>
  );
}
