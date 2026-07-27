import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, notFound } from "@/lib/api";
import { PRIORITY_LABELS, type Priority } from "@/lib/constants";

// Assistant summary. This is a deterministic, rule-based composer so the
// feature works with no external dependency. The response shape and the
// call site are designed so this can be swapped for an LLM call (e.g. the
// Claude API) without touching the client. It NEVER replaces medical
// judgment — it only organizes what was already recorded.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const p = await prisma.parecer.findUnique({
    where: { id },
    include: {
      requestingSpecialty: true,
      requestedSpecialty: true,
      attachments: true,
    },
  });
  if (!p) return notFound("Parecer não encontrado");

  const lines: string[] = [];
  lines.push(
    `Interconsulta de ${p.requestingSpecialty.name} para ${p.requestedSpecialty.name}, prioridade ${PRIORITY_LABELS[p.priority as Priority] ?? p.priority}.`,
  );
  lines.push(`Paciente ${p.patientName} (prontuário ${p.patientRecord})${p.bed ? `, ${p.bed}` : ""}.`);
  lines.push(`Hipótese diagnóstica: ${p.diagnosis}.`);
  lines.push(`Motivo do parecer: ${p.reason}.`);
  lines.push(`Resumo clínico informado: ${p.clinicalSummary}`);

  if (p.attachments.length) {
    const kinds = Array.from(new Set(p.attachments.map((a) => a.kind)));
    lines.push(`Exames/anexos disponíveis: ${kinds.join(", ")} (${p.attachments.length} arquivo(s)).`);
  } else {
    lines.push("Sem exames anexados até o momento — considere solicitar os pertinentes.");
  }

  const questions = [
    "Há sinais de instabilidade hemodinâmica ou critérios de gravidade no momento?",
    "Quais exames complementares mudariam a conduta imediata?",
    "Existe indicação de intervenção/procedimento com urgência?",
  ];

  return NextResponse.json({
    summary: lines.join(" "),
    suggestedQuestions: questions,
    disclaimer:
      "Resumo gerado por assistente. Não substitui a avaliação e a decisão médica.",
  });
}
