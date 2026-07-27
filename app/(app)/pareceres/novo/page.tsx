import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { NewParecerForm } from "@/components/NewParecerForm";
import { IconArrowRight } from "@/components/icons";

export default async function NovoParecerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Offer every specialty except the requester's own, com o tipo de resposta
  // (modo) configurado no hospital ativo — que define as classificações
  // de prioridade disponíveis.
  const [specialtiesRaw, hospitalSpecialties] = await Promise.all([
    prisma.specialty.findMany({
      where: user.specialtyId ? { id: { not: user.specialtyId } } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    user.activeHospitalId
      ? prisma.hospitalSpecialty.findMany({
          where: { hospitalId: user.activeHospitalId },
          select: { specialtyId: true, mode: true },
        })
      : Promise.resolve([]),
  ]);
  const modeBy = new Map(hospitalSpecialties.map((h) => [h.specialtyId, h.mode]));
  const specialties = specialtiesRaw.map((s) => ({
    ...s,
    mode: modeBy.get(s.id) ?? "URGENCIA",
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/pareceres"
        className="mb-3 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
      >
        <IconArrowRight size={14} className="rotate-180" /> Pareceres
      </Link>
      <PageHeader
        title="Novo parecer"
        subtitle="Solicitação de interconsulta — gera um ticket clínico rastreável"
      />
      <NewParecerForm
        specialties={specialties}
        ownSpecialtyName={user.specialty?.name ?? null}
      />
    </div>
  );
}
