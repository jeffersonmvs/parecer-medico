import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, PageHeader, Avatar, Badge } from "@/components/ui";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PushToggle } from "@/components/PushToggle";
import { HospitalSwitcher } from "@/components/HospitalSwitcher";
import { ProfileEditor } from "@/components/ProfileEditor";
import { listUserHospitals } from "@/lib/hospital";
import { labelForRole } from "@/lib/constants";
import { can } from "@/lib/rbac";
import { formatDateTime } from "@/lib/format";
import { IconArrowRight, IconAlert, IconUser, IconHospital } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [recentAudit, hospitals, specialties] = await Promise.all([
    prisma.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    listUserHospitals(user.id),
    prisma.specialty.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Perfil" subtitle="Sua conta e segurança" />

      <Card className="mb-5 p-5">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size={60} />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">{user.name}</h2>
            <p className="text-sm text-fg-muted">{user.email}</p>
            {user.phone ? (
              <p className="text-sm text-fg-muted">{user.phone}</p>
            ) : null}
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge color="primary">{labelForRole(user.role)}</Badge>
              {user.specialty ? (
                <Badge>{user.specialty.name}</Badge>
              ) : null}
              {user.crm ? <Badge>{user.crm}</Badge> : null}
              {user.rqe ? <Badge>RQE {user.rqe}</Badge> : null}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <LogoutButton />
          <Link
            href="/trocar-senha"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm font-semibold transition hover:bg-surface"
          >
            Trocar senha
          </Link>
          <div className="ml-auto flex items-center gap-2 text-sm text-fg-muted">
            Tema <ThemeToggle />
          </div>
        </div>
      </Card>

      <Card className="mb-5">
        <CardHeader
          title="Meus dados"
          subtitle="Nome, CRM, RQE, telefone e especialidade"
        />
        <ProfileEditor
          initial={{
            name: user.name,
            crm: user.crm,
            rqe: user.rqe,
            phone: user.phone,
            specialtyId: user.specialtyId,
          }}
          specialties={specialties}
        />
      </Card>

      <Card className="mb-5">
        <CardHeader
          title="Hospital"
          subtitle={
            hospitals.length > 1
              ? "Você atua em mais de uma unidade — troque quando precisar"
              : "Unidade em que você está atuando"
          }
        />
        <HospitalSwitcher
          hospitals={hospitals}
          activeId={user.activeHospitalId}
        />
      </Card>

      {can(user.role, "escalation.configure") || can(user.role, "users.manage") ? (
        <Card className="mb-5">
          <CardHeader
            title="Configurações"
            subtitle="Ajustes da coordenação / direção"
          />
          <div className="p-2">
            {can(user.role, "users.manage") ? (
              <Link
                href="/admin/usuarios"
                className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-surface-2"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <IconUser size={20} />
                </span>
                <div className="flex-1">
                  <p className="font-medium">Gestão de usuários</p>
                  <p className="text-sm text-fg-muted">
                    Cadastros, papéis e liberação de acesso
                  </p>
                </div>
                <IconArrowRight size={18} className="text-fg-muted" />
              </Link>
            ) : null}
            {can(user.role, "hospital.configure") ? (
              <Link
                href="/admin/hospitais"
                className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-surface-2"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <IconHospital size={20} />
                </span>
                <div className="flex-1">
                  <p className="font-medium">Configuração de hospitais</p>
                  <p className="text-sm text-fg-muted">
                    Especialidades, coordenadores, responsáveis e escalonamento
                  </p>
                </div>
                <IconArrowRight size={18} className="text-fg-muted" />
              </Link>
            ) : null}
            {can(user.role, "escalation.configure") ? (
              <Link
                href="/escalonamento"
                className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-surface-2"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <IconAlert size={20} />
                </span>
                <div className="flex-1">
                  <p className="font-medium">Escalonamento (legado)</p>
                  <p className="text-sm text-fg-muted">
                    Tempos globais — substituído pela config por hospital
                  </p>
                </div>
                <IconArrowRight size={18} className="text-fg-muted" />
              </Link>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="mb-5">
        <CardHeader
          title="Notificações"
          subtitle="Alertas de novos pareceres e chamados no seu dispositivo"
        />
        <div className="p-4">
          <PushToggle />
        </div>
      </Card>

      <Card className="mb-5">
        <CardHeader
          title="Segurança"
          subtitle="Login individual, auditoria e assinatura eletrônica"
        />
        <div className="space-y-3 p-4 text-sm">
          <Row label="Senha" value="Criptografada (bcrypt)" ok />
          <Row
            label="Autenticação em dois fatores"
            value={user.twoFactor ? "Ativada" : "Disponível (configurar)"}
            ok={user.twoFactor}
          />
          <Row label="Sessão" value="Token assinado, expira em 12h" ok />
          <Row
            label="Assinatura eletrônica"
            value="Baseada no login autenticado + trilha de auditoria"
            ok
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Atividade recente"
          subtitle="Trilha de auditoria imutável"
        />
        <div className="p-4">
          {recentAudit.length === 0 ? (
            <p className="text-sm text-fg-muted">Sem registros.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentAudit.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 border-b border-line pb-2 last:border-0"
                >
                  <span className="font-mono text-xs">{a.action}</span>
                  <span className="text-xs text-fg-muted">
                    {formatDateTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-fg-muted">{label}</span>
      <span className="flex items-center gap-1.5 text-right font-medium">
        <span
          className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-routine" : "bg-urgent"}`}
        />
        {value}
      </span>
    </div>
  );
}
