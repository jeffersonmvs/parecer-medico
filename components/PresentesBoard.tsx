"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Card, Spinner, Badge } from "@/components/ui";
import { IconPulse } from "@/components/icons";

type Present = {
  doctorId: string;
  doctorName: string;
  origem: string;
  turno: string;
  turnoLabel: string;
  selfAt: string | null;
  selfInside: boolean | null;
  nurseConfirmed: boolean | null;
  coordConfirmed: boolean | null;
};

type Group = {
  sectorId: string;
  sectorName: string;
  present: Present[];
};

type Data = { now: string; total: number; groups: Group[] };

function Stage({ done, label }: { done: boolean | null; label: string }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 " +
        (done ? "text-routine" : "text-fg-muted")
      }
    >
      <span
        className={
          "inline-block h-1.5 w-1.5 rounded-full " +
          (done ? "bg-routine" : "bg-line")
        }
      />
      {label}
    </span>
  );
}

export function PresentesBoard() {
  const { data, isLoading } = useSWR<Data>("/api/execucao/presentes", fetcher, {
    refreshInterval: 30000,
  });

  if (isLoading || !data) {
    return (
      <Card className="p-6">
        <div className="flex justify-center text-fg-muted">
          <Spinner className="h-6 w-6" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-routine" />
            Presentes agora
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            Profissionais com presença declarada em turnos em andamento.
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold">{data.total}</span>
          <p className="text-[11px] text-fg-muted">
            atualizado{" "}
            {new Date(data.now).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </Card>

      {data.groups.length === 0 ? (
        <Card className="p-6 text-center text-sm text-fg-muted">
          Nenhum profissional com presença declarada nos turnos em andamento.
        </Card>
      ) : (
        data.groups.map((g) => (
          <Card key={g.sectorId} className="p-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold">
                <IconPulse size={16} className="text-primary" />
                {g.sectorName}
              </p>
              <Badge color="primary">{g.present.length}</Badge>
            </div>
            <ul className="mt-3 divide-y divide-line">
              {g.present.map((p) => (
                <li
                  key={p.doctorId + p.turno}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {p.doctorName}
                    </p>
                    <p className="text-[11px] text-fg-muted">
                      {p.turnoLabel}
                      {p.selfAt
                        ? " · declarou às " +
                          new Date(p.selfAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                      {p.selfInside === false ? " · fora do perímetro" : ""}
                    </p>
                  </div>
                  <div className="flex gap-3 text-[11px]">
                    <Stage done={p.nurseConfirmed} label="Enferm." />
                    <Stage done={p.coordConfirmed} label="Coord." />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
}
