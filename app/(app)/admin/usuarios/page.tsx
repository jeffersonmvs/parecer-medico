import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState } from "@/components/ui";
import { UserManager } from "@/components/UserManager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!can(user.role, "users.manage")) {
    return (
      <div>
        <PageHeader title="Usuários" />
        <EmptyState
          title="Sem permissão"
          description="Apenas a administração do PARECER+ pode gerenciar usuários."
        />
      </div>
    );
  }

  const [specialties, hospitals] = await Promise.all([
    prisma.specialty.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.hospital.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Gestão de Usuários"
        subtitle="Cadastros, papéis, especialidades e liberação de acesso"
      />
      <UserManager specialties={specialties} hospitals={hospitals} />
    </div>
  );
}
