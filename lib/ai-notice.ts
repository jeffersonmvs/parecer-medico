import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export type NoticeDraft = { title: string; body: string };
export type ImprovedNotice = NoticeDraft & { usedAI: boolean };

// Model used to polish institutional notices before they reach the clinical
// staff. Kept here so it is easy to change in one place.
const MODEL = "claude-opus-5";

const SYSTEM = `Você é o editor de comunicação institucional do PARECER+, sistema
de comunicação clínica de um hospital público brasileiro. Recebe o rascunho de
um aviso escrito por um diretor ou coordenador e o devolve revisado para ser lido
pelo corpo clínico (médicos, enfermagem, plantonistas).

Regras:
- Corrija ortografia, gramática, acentuação e pontuação (português do Brasil).
- Deixe o texto claro, objetivo e cordial, com tom profissional e institucional.
- Preserve integralmente o SENTIDO, os fatos, datas, horários, nomes, setores,
  números e telefones do original. Nunca invente informação.
- Não acrescente saudações, assinaturas, emojis ou floreios desnecessários.
- Um título curto e direto (até ~80 caracteres). O corpo pode ter parágrafos.
- Se o rascunho já estiver bom, faça apenas ajustes mínimos.
Responda somente pela ferramenta.`;

// Heuristic fallback used when no ANTHROPIC_API_KEY is configured, or the API
// call fails. It performs light, safe cleanup only — never changes meaning.
export function heuristicImprove(draft: NoticeDraft): ImprovedNotice {
  const clean = (s: string) =>
    s
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/ +([,.;:!?])/g, "$1")
      .trim();

  const sentenceCase = (s: string) =>
    s.replace(/(^\s*|[.!?]\s+)([a-zà-ú])/g, (_m, p, c) => p + c.toUpperCase());

  let title = clean(draft.title);
  title = sentenceCase(title).replace(/[.\s]+$/, "");

  let body = clean(draft.body);
  body = body
    .split("\n")
    .map((line) => sentenceCase(line))
    .join("\n");
  if (body && !/[.!?…)]$/.test(body)) body += ".";

  return { title, body, usedAI: false };
}

/**
 * Improves an institutional notice draft. Uses the Claude API when
 * ANTHROPIC_API_KEY is set; otherwise (or on error) returns a heuristic
 * cleanup so the feature degrades gracefully.
 */
export async function improveNotice(draft: NoticeDraft): Promise<ImprovedNotice> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return heuristicImprove(draft);
  }

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      tool_choice: { type: "tool", name: "aviso_revisado" },
      tools: [
        {
          name: "aviso_revisado",
          description: "Devolve o aviso institucional já revisado.",
          input_schema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Título revisado, curto e direto.",
              },
              body: {
                type: "string",
                description: "Corpo do aviso revisado.",
              },
            },
            required: ["title", "body"],
          },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Revise o aviso abaixo.\n\nTítulo: ${draft.title}\n\nConteúdo:\n${draft.body}`,
        },
      ],
    });

    const toolUse = message.content.find((b) => b.type === "tool_use");
    if (toolUse && toolUse.type === "tool_use") {
      const input = toolUse.input as Partial<NoticeDraft>;
      const title = (input.title ?? "").trim();
      const body = (input.body ?? "").trim();
      if (title && body) return { title, body, usedAI: true };
    }
    // Model returned nothing usable — fall back safely.
    return heuristicImprove(draft);
  } catch {
    return heuristicImprove(draft);
  }
}
