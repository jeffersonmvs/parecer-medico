// Helpers do módulo NUMED (Registro de Execução de Plantão).
//
// O servidor roda em UTC; o hospital opera no fuso America/Sao_Paulo (BRT,
// UTC-3, sem horário de verão desde 2019). Para o registro de execução o que
// importa é a DATA-CALENDÁRIO do plantão em BRT e o prazo de homologação
// (D+1 12:00 BRT). As funções abaixo isolam essa conversão.

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC-3

/** Componentes de ano/mês/dia da data-calendário em BRT para um instante. */
export function brtDateParts(instant: Date = new Date()): {
  y: number;
  m: number;
  d: number;
  hour: number;
} {
  const shifted = new Date(instant.getTime() - BRT_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth(),
    d: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
  };
}

/**
 * Data do registro (campo @db.Date). Guardamos a meia-noite UTC da
 * data-calendário BRT, para que a coluna DATE não sofra deslocamento de fuso.
 */
export function registryDate(instant: Date = new Date()): Date {
  const { y, m, d } = brtDateParts(instant);
  return new Date(Date.UTC(y, m, d));
}

/**
 * Prazo de homologação do coordenador: D+1 às 12:00 BRT (= 15:00 UTC).
 * `date` é a data-calendário do plantão (meia-noite UTC de registryDate).
 */
export function prazoFor(date: Date): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  return new Date(Date.UTC(y, m, d + 1, 12 + 3, 0, 0));
}

import {
  TURNOS,
  TURNO_START_HOUR,
  DECLARACAO_JANELA_HORAS,
  type Turno,
} from "./constants";

const HOUR_MS = 60 * 60 * 1000;

/** Instante UTC correspondente a `hour:00` BRT na data-calendário informada. */
function brtInstant(parts: { y: number; m: number; d: number }, hour: number): Date {
  return new Date(Date.UTC(parts.y, parts.m, parts.d, hour + 3, 0, 0));
}

/**
 * Janela em que o médico pode declarar a presença de um turno: do início da
 * jornada (com uma tolerância de 1h para quem chega mais cedo) até 2h após o
 * início. Calculada na data-calendário BRT de `instant`.
 */
export function declarationWindow(
  turno: Turno,
  instant: Date = new Date(),
): { opensAt: Date; closesAt: Date; startsAt: Date } {
  const parts = brtDateParts(instant);
  const startsAt = brtInstant(parts, TURNO_START_HOUR[turno]);
  return {
    startsAt,
    opensAt: new Date(startsAt.getTime() - 1 * HOUR_MS),
    closesAt: new Date(startsAt.getTime() + DECLARACAO_JANELA_HORAS * HOUR_MS),
  };
}

/** A janela de declaração do turno está aberta neste instante? */
export function isDeclarationOpen(turno: Turno, instant: Date = new Date()): boolean {
  const { opensAt, closesAt } = declarationWindow(turno, instant);
  const t = instant.getTime();
  return t >= opensAt.getTime() && t <= closesAt.getTime();
}

/** Turnos cuja janela de declaração está aberta agora. */
export function openTurnos(instant: Date = new Date()): Turno[] {
  return TURNOS.filter((t) => isDeclarationOpen(t, instant));
}

/**
 * Turnos em andamento neste instante e a data-calendário do plantão a que
 * pertencem. Usado no painel de "presentes agora". O noturno atravessa a
 * meia-noite: das 19:00 pertence ao dia atual; da 00:00 às 07:00 pertence ao
 * dia anterior.
 */
export function activeTurnosNow(
  instant: Date = new Date(),
): { turno: Turno; data: Date }[] {
  const { hour } = brtDateParts(instant);
  const today = registryDate(instant);
  const yesterday = new Date(today.getTime() - 24 * HOUR_MS);
  const out: { turno: Turno; data: Date }[] = [];
  if (hour >= 7 && hour < 13) out.push({ turno: "M", data: today });
  if (hour >= 13 && hour < 19) out.push({ turno: "T", data: today });
  if (hour >= 7 && hour < 19) out.push({ turno: "D", data: today });
  if (hour >= 19) out.push({ turno: "N", data: today });
  if (hour < 7) out.push({ turno: "N", data: yesterday });
  return out;
}

/**
 * Turno sugerido para a declaração: o primeiro cuja janela está aberta agora
 * (ex.: às 08:00 sugere Manhã). Sem janela aberta, cai no diurno.
 */
export function guessTurno(instant: Date = new Date()): Turno {
  return openTurnos(instant)[0] ?? "D";
}
