import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ticketCode } from "../lib/parecer";

const prisma = new PrismaClient();

const SPECIALTIES = [
  ["Clínica Médica", "CLM"],
  ["Cirurgia Geral", "CIR"],
  ["Ortopedia", "ORT"],
  ["Cardiologia", "CAR"],
  ["Neurologia", "NEU"],
  ["Anestesiologia", "ANE"],
  ["Pediatria", "PED"],
  ["Nefrologia", "NEF"],
  ["Psiquiatria", "PSI"],
  ["UTI / Intensivismo", "UTI"],
];

async function main() {
  console.log("Seeding Hospital Clinical Workflow…");

  // Clean (order matters for FKs)
  await prisma.auditLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.parecerEvent.deleteMany();
  await prisma.parecer.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.institutionalCall.deleteMany();
  await prisma.escalationConfig.deleteMany();
  await prisma.user.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.hospital.deleteMany();

  const hospital = await prisma.hospital.create({
    data: { name: "Hospital Geral São Lucas" },
  });

  const specialties = await Promise.all(
    SPECIALTIES.map(([name, code]) =>
      prisma.specialty.create({ data: { name, code } }),
    ),
  );
  const bySpec = Object.fromEntries(specialties.map((s) => [s.code, s]));

  // Escalation config per specialty (configurable in the app)
  await Promise.all(
    specialties.map((s) =>
      prisma.escalationConfig.create({
        data: { specialtyId: s.id },
      }),
    ),
  );

  const pw = await bcrypt.hash("plantao123", 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Dra. Helena Prado",
        email: "diretoria@hospital.dev",
        crm: "CRM-SP 10001",
        passwordHash: pw,
        role: "DIRECAO_CLINICA",
        hospitalId: hospital.id,
        specialtyId: bySpec.CLM.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Dr. Marcos Vinícius",
        email: "cardio@hospital.dev",
        crm: "CRM-SP 20112",
        passwordHash: pw,
        role: "COORDENADOR_ESPECIALIDADE",
        hospitalId: hospital.id,
        specialtyId: bySpec.CAR.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Dr. André Ramos",
        email: "cirurgia@hospital.dev",
        crm: "CRM-SP 30455",
        passwordHash: pw,
        role: "MEDICO_PLANTONISTA",
        hospitalId: hospital.id,
        specialtyId: bySpec.CIR.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Dra. Beatriz Nunes",
        email: "clinica@hospital.dev",
        crm: "CRM-SP 40987",
        passwordHash: pw,
        role: "MEDICO_ASSISTENTE",
        hospitalId: hospital.id,
        specialtyId: bySpec.CLM.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Dr. Felipe Costa",
        email: "orto@hospital.dev",
        crm: "CRM-SP 50231",
        passwordHash: pw,
        role: "MEDICO_PLANTONISTA",
        hospitalId: hospital.id,
        specialtyId: bySpec.ORT.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Dr. Rafael Lima (Residente)",
        email: "residente@hospital.dev",
        crm: "CRM-SP 60777",
        passwordHash: pw,
        role: "RESIDENTE",
        hospitalId: hospital.id,
        specialtyId: bySpec.CLM.id,
      },
    }),
  ]);

  const [diretora, cardio, cirurgiao, clinica, orto] = users;

  // Some doctors are on shift already.
  await prisma.shift.createMany({
    data: [
      { userId: cardio.id, specialtyId: bySpec.CAR.id, hospitalId: hospital.id, status: "AVAILABLE" },
      { userId: cirurgiao.id, specialtyId: bySpec.CIR.id, hospitalId: hospital.id, status: "SURGERY" },
      { userId: orto.id, specialtyId: bySpec.ORT.id, hospitalId: hospital.id, status: "AVAILABLE" },
    ],
  });

  // A running ticket counter (seed a few pareceres in varied states).
  let seq = 0;
  const now = Date.now();
  const min = 60_000;

  async function makeParecer(opts: {
    requester: (typeof users)[number];
    reqSpecCode: string;
    priority: string;
    status: string;
    patientName: string;
    record: string;
    bed: string;
    diagnosis: string;
    reason: string;
    summary: string;
    assignee?: (typeof users)[number];
    createdMinAgo: number;
    opinion?: string;
  }) {
    seq += 1;
    const created = new Date(now - opts.createdMinAgo * min);
    const accepted =
      opts.status !== "SOLICITADO" && opts.status !== "RECEBIDO"
        ? new Date(created.getTime() + 8 * min)
        : null;
    const completed =
      opts.status === "CONCLUIDO"
        ? new Date(created.getTime() + 40 * min)
        : null;

    const parecer = await prisma.parecer.create({
      data: {
        code: ticketCode(seq),
        patientName: opts.patientName,
        patientRecord: opts.record,
        bed: opts.bed,
        diagnosis: opts.diagnosis,
        reason: opts.reason,
        clinicalSummary: opts.summary,
        priority: opts.priority,
        status: opts.status,
        opinion: opts.opinion,
        hospitalId: hospital.id,
        requestingSpecialtyId: opts.requester.specialtyId!,
        requestedSpecialtyId: bySpec[opts.reqSpecCode].id,
        requesterId: opts.requester.id,
        assigneeId: opts.assignee?.id,
        createdAt: created,
        acceptedAt: accepted,
        completedAt: completed,
      },
    });

    await prisma.parecerEvent.create({
      data: {
        parecerId: parecer.id,
        type: "STATUS",
        toStatus: "SOLICITADO",
        userId: opts.requester.id,
        note: "Parecer solicitado",
        location: "Pronto-Socorro",
        createdAt: created,
      },
    });
    if (accepted && opts.assignee) {
      await prisma.parecerEvent.create({
        data: {
          parecerId: parecer.id,
          type: "STATUS",
          fromStatus: "SOLICITADO",
          toStatus: "ACEITO",
          userId: opts.assignee.id,
          note: "Parecer aceito",
          location: "Enfermaria",
          durationMs: 8 * min,
          createdAt: accepted,
        },
      });
      await prisma.message.create({
        data: {
          parecerId: parecer.id,
          senderId: opts.assignee.id,
          body: "Estou a caminho do leito para avaliar o paciente.",
          deliveredAt: accepted,
          readAt: accepted,
          createdAt: accepted,
        },
      });
    }
    return parecer;
  }

  await makeParecer({
    requester: clinica,
    reqSpecCode: "CAR",
    priority: "URGENTE",
    status: "SOLICITADO",
    patientName: "João P. Ferreira",
    record: "0456123",
    bed: "Enf. 3B - Leito 12",
    diagnosis: "Dor torácica, suspeita de SCA",
    reason: "Avaliação cardiológica urgente e conduta.",
    summary:
      "Masculino, 62a, HAS e DM2, dor precordial há 2h, ECG com alteração de ST em parede inferior. Troponina em coleta.",
    createdMinAgo: 6,
  });

  await makeParecer({
    requester: clinica,
    reqSpecCode: "CIR",
    priority: "EMERGENCIA",
    status: "ACEITO",
    patientName: "Maria S. Oliveira",
    record: "0456980",
    bed: "PS - Sala Vermelha",
    diagnosis: "Abdome agudo obstrutivo",
    reason: "Avaliar indicação cirúrgica de urgência.",
    summary:
      "Feminino, 54a, dor abdominal difusa, distensão, parada de eliminação de gases há 12h. TC com sinais de obstrução.",
    assignee: cirurgiao,
    createdMinAgo: 22,
  });

  await makeParecer({
    requester: diretora,
    reqSpecCode: "ORT",
    priority: "ROTINA",
    status: "EM_ATENDIMENTO",
    patientName: "Carlos A. Souza",
    record: "0451234",
    bed: "Enf. 2A - Leito 7",
    diagnosis: "Fratura de fêmur consolidando",
    reason: "Reavaliação e plano de reabilitação.",
    summary: "Masculino, 71a, pós-operatório de osteossíntese, estável.",
    assignee: orto,
    createdMinAgo: 120,
  });

  await makeParecer({
    requester: clinica,
    reqSpecCode: "CAR",
    priority: "ROTINA",
    status: "CONCLUIDO",
    patientName: "Luiza M. Andrade",
    record: "0448765",
    bed: "Enf. 1C - Leito 3",
    diagnosis: "FA de alta resposta",
    reason: "Ajuste de anticoagulação e controle de FC.",
    summary: "Feminino, 68a, palpitações, FC 130 irregular. Já anticoagulada.",
    assignee: cardio,
    createdMinAgo: 300,
    opinion:
      "Optado por controle de frequência com betabloqueador. Mantida anticoagulação plena. Reavaliar em 48h. Sem indicação de cardioversão no momento.",
  });

  await prisma.notice.createMany({
    data: [
      {
        title: "Novo protocolo de sepse — vigência imediata",
        body: "A partir de hoje, todos os casos com suspeita de sepse devem seguir o bundle da 1ª hora. Material completo em anexo.",
        category: "PROTOCOLO",
        urgent: true,
        authorId: diretora.id,
      },
      {
        title: "Escala de plantão — próxima semana publicada",
        body: "A escala definitiva já está disponível. Confiram seus plantões e sinalizem trocas até sexta.",
        category: "ESCALA",
        authorId: diretora.id,
      },
      {
        title: "Treinamento: uso da plataforma de pareceres",
        body: "Sessão prática na quinta às 14h no auditório. Participação recomendada a todos os plantonistas.",
        category: "TREINAMENTO",
        authorId: diretora.id,
      },
    ],
  });

  await prisma.institutionalCall.createMany({
    data: [
      {
        type: "Vaga UTI",
        description: "Paciente séptico do PS aguardando leito de UTI.",
        slaMinutes: 30,
        requesterId: clinica.id,
        hospitalId: hospital.id,
      },
      {
        type: "Avaliação multiprofissional",
        description: "Paciente crônico para discussão de alta.",
        slaMinutes: 120,
        requesterId: diretora.id,
        hospitalId: hospital.id,
      },
    ],
  });

  console.log("Seed complete. Login with any of:");
  console.log("  diretoria@hospital.dev / plantao123  (Direção Clínica)");
  console.log("  cardio@hospital.dev    / plantao123  (Coordenador Cardio)");
  console.log("  cirurgia@hospital.dev  / plantao123  (Plantonista Cirurgia)");
  console.log("  clinica@hospital.dev   / plantao123  (Assistente Clínica)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
