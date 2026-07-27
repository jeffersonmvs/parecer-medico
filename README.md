# Parecer+ · Hospital Clinical Workflow

Plataforma de **comunicação clínica hospitalar** e **gestão de solicitações de
parecer médico** (interconsultas). Substitui ligações, WhatsApp e pedidos
verbais por um fluxo rastreável, auditável e com indicadores — pensado para ser
usado com rapidez durante o plantão (ações principais em poucos toques).

> Este repositório é um **MVP funcional e executável** do produto descrito na
> especificação. Ele implementa o núcleo do sistema ponta a ponta e deixa a
> arquitetura pronta para evoluir para os módulos futuros.

## O que está implementado

| Módulo | Status |
|---|---|
| **Solicitação de parecer médico** (módulo principal): formulário → *ticket clínico* → workflow completo | ✅ |
| **Workflow do parecer** (Solicitado → Recebido → Aceito → Em atendimento → Parecer realizado → Concluído / Cancelado) com registro de usuário, data/hora, local e tempo por etapa | ✅ |
| **Linha do tempo** por caso (timeline imutável de eventos) | ✅ |
| **Chat vinculado ao caso** (mensagens presas ao paciente, confirmação de entrega/leitura) | ✅ |
| **Anexos** por caso (laboratório, imagem, fotos, documentos) | ✅ |
| **Central de Plantão** em tempo real: check-in/checkout, status do médico, board por especialidade, pendências e tempo médio | ✅ |
| **Dashboard Operacional + Executivo** (indicadores, gráficos, especialidades sem cobertura, médicos sobrecarregados) | ✅ |
| **Avisos institucionais** (comunicados, protocolos, escalas, urgentes) | ✅ |
| **Assistente de IA** (resumo do caso + perguntas sugeridas — nunca substitui a decisão médica) | ✅ (heurístico, pronto para plugar um LLM) |
| **Segurança**: login individual, senha com hash (bcrypt), sessão JWT em cookie httpOnly, RBAC por perfil, trilha de auditoria imutável (IP + dispositivo), assinatura eletrônica baseada no login | ✅ |
| **PWA**: instalável, manifest, service worker (offline shell + handler de push pronto para FCM) | ✅ |
| **UI**: responsiva (mobile-first), modo claro/escuro, poucos cliques, botões grandes | ✅ |

### Escopo futuro (deixado como base arquitetural)
Escalonamento automático agendado (a config por especialidade já existe no
schema), upload real para S3, push via Firebase Cloud Messaging, mensagens de
voz/vídeo, WebSocket dedicado (hoje as telas ao vivo usam polling), app React
Native, integrações HL7/FHIR, assinatura ICP-Brasil, 2FA, Bluetooth Beacon.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (design system próprio, tema claro/escuro)
- **Prisma** ORM — **SQLite** por padrão (zero-config); trocável para
  **PostgreSQL** alterando o `provider`/`DATABASE_URL` em `prisma/schema.prisma`
- **jose** (JWT) + **bcryptjs** (hash) + **zod** (validação)
- **SWR** para dados ao vivo; gráficos em **SVG** feitos à mão (sem dependências)

A escolha por um app Next full-stack executável (em vez de microsserviços +
Kubernetes) mantém o MVP rodável em um comando, preservando fronteiras de módulo
claras (`lib/` domínio, `app/api/` serviços, `components/` UI) para uma futura
extração em serviços independentes.

## Como rodar

```bash
npm install
npm run setup      # gera o client, cria o SQLite e popula dados de demonstração
npm run dev        # http://localhost:3000
```

Ou build de produção:

```bash
npm run build && npm start
```

### Scripts úteis
- `npm run setup` — `prisma generate` + `db push` + seed
- `npm run db:seed` — repovoa os dados de demonstração
- `npm run db:reset` — recria o banco do zero e popula
- `npm run typecheck` — checagem de tipos

## Contas de demonstração

Senha para todas: **`plantao123`**

| E-mail | Perfil |
|---|---|
| `diretoria@hospital.dev` | Direção Clínica (vê o painel executivo, publica avisos) |
| `cardio@hospital.dev` | Coordenador de Cardiologia |
| `cirurgia@hospital.dev` | Médico Plantonista (Cirurgia Geral) |
| `clinica@hospital.dev` | Médico Assistente (Clínica Médica) |

Fluxo sugerido: entre como **Clínica**, crie um parecer para **Cardiologia**,
depois entre como **Cardio** para aceitá-lo, conversar no chat do caso e
registrar o parecer — acompanhe tudo pela linha do tempo e pelo painel.

## Estrutura

```
app/
  (app)/            páginas autenticadas (shell com nav + PWA)
    inicio/         home: ações rápidas, pareceres da sua especialidade, avisos
    pareceres/      lista, novo parecer e detalhe do caso (workflow, chat, timeline)
    plantao/        central de plantão em tempo real
    dashboard/      indicadores operacionais + executivos
    perfil/         conta, segurança e auditoria
  api/              rotas de serviço (auth, pareceres, plantão, avisos)
  login/            autenticação
components/          UI e componentes de domínio (charts SVG, badges, chat…)
lib/                 domínio: auth, rbac, workflow, métricas, auditoria, constantes
prisma/              schema + seed
middleware.ts        proteção de rotas (verificação de sessão no edge)
```

## Notas de segurança

- Senhas nunca são armazenadas em texto; sessões são JWT assinados (HS256) em
  cookie `httpOnly`/`sameSite`.
- Toda mutação relevante grava um `AuditLog` (ação, usuário, IP, dispositivo,
  horário) — base da assinatura eletrônica e da trilha imutável.
- `JWT_SECRET` deve ser definido em produção (veja `.env.example`).
