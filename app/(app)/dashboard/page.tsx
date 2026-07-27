import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { computeMetrics } from "@/lib/metrics";
import { can } from "@/lib/rbac";
import { Card, CardHeader, PageHeader, Badge } from "@/components/ui";
import { StatTile, BarList, Donut, LineChart, HeatRow } from "@/components/charts";
import { formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const m = await computeMetrics(user.activeHospitalId);
  const executive = can(user.role, "dashboard.executive");

  return (
    <div>
      <PageHeader
        title="Painel Operacional"
        subtitle="Indicadores assistenciais em tempo real"
        action={
          executive ? <Badge color="primary">Visão executiva</Badge> : undefined
        }
      />

      {/* Headline stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Pareceres pendentes"
          value={m.pending}
          tone={m.pending > 0 ? "urgent" : "routine"}
        />
        <StatTile
          label="Pacientes aguardando"
          value={m.patientsWaiting}
          hint="prontuários distintos"
        />
        <StatTile
          label="Tempo médio de resposta"
          value={m.avgResponseMs != null ? formatDuration(m.avgResponseMs) : "—"}
          tone="primary"
        />
        <StatTile
          label="Tempo máximo"
          value={m.maxResponseMs != null ? formatDuration(m.maxResponseMs) : "—"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Distribuição por prioridade" />
          <div className="p-4">
            <Donut
              data={[
                { label: "Emergência", value: m.byPriority.EMERGENCIA, color: "var(--emergency)" },
                { label: "Urgente", value: m.byPriority.URGENTE, color: "var(--urgent)" },
                { label: "Rotina", value: m.byPriority.ROTINA, color: "var(--routine)" },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Chamados nos últimos 7 dias" />
          <div className="p-4">
            <LineChart points={m.trend} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Especialidades mais solicitadas"
            subtitle="Para onde vão os pareceres"
          />
          <div className="p-4">
            <BarList data={m.requestedRanking.slice(0, 6)} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Especialidades que mais solicitam"
            subtitle="De onde partem os pareceres"
          />
          <div className="p-4">
            <BarList data={m.requestingRanking.slice(0, 6)} color="var(--info)" />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Tempo médio de resposta por especialidade"
            subtitle="Da solicitação ao aceite"
          />
          <div className="p-4">
            <BarList
              data={m.timeBySpecialty.slice(0, 6)}
              unit=" min"
              color="var(--urgent)"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Volume por hora do dia" />
          <div className="p-4">
            <HeatRow values={m.perHour} />
          </div>
        </Card>
      </div>

      {/* Executive-only section */}
      {executive ? (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-bold">Visão Executiva</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Plantões descobertos com pendências"
                subtitle="Especialidades sem plantonista ativo"
              />
              <div className="p-4">
                {m.uncovered.length === 0 ? (
                  <p className="text-sm text-routine">
                    Todas as especialidades com pendências estão cobertas.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {m.uncovered.map((s) => (
                      <li
                        key={s.label}
                        className="flex items-center justify-between rounded-xl border border-emergency/30 bg-emergency/10 px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{s.label}</span>
                        <Badge color="emergency">{s.value} pendente(s)</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Médicos mais sobrecarregados"
                subtitle="Pareceres em aberto sob responsabilidade"
              />
              <div className="p-4">
                <BarList
                  data={m.doctorRanking.slice(0, 6)}
                  color="var(--emergency)"
                />
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Resumo de produção" />
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                <StatTile label="Total de pareceres" value={m.total} />
                <StatTile label="Concluídos" value={m.concluded} tone="routine" />
                <StatTile label="Cancelados" value={m.cancelled} />
                <StatTile
                  label="Taxa de conclusão"
                  value={
                    m.total > 0
                      ? `${Math.round((m.concluded / m.total) * 100)}%`
                      : "—"
                  }
                  tone="primary"
                />
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
