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

/**
 * Turno provável a partir do horário BRT: Diurno das 07:00 às 18:59,
 * Noturno caso contrário. É apenas o padrão sugerido — o médico confirma.
 */
export function guessTurno(instant: Date = new Date()): "D" | "N" {
  const { hour } = brtDateParts(instant);
  return hour >= 7 && hour < 19 ? "D" : "N";
}
