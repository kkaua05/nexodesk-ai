/**
 * Money is always represented as integer cents (BRL) to avoid float rounding errors.
 * Never store or compute monetary values as JS `number` floats beyond this boundary.
 */
export type Cents = number;

export function toCents(reais: number): Cents {
  return Math.round(reais * 100);
}

export function fromCents(cents: Cents): number {
  return cents / 100;
}

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCents(cents: Cents): string {
  return BRL_FORMATTER.format(fromCents(cents));
}

export function sumCents(...values: Cents[]): Cents {
  return values.reduce((acc, v) => acc + v, 0);
}

/**
 * Splits a total into `count` installments without losing/gaining cents to rounding —
 * remainder cents are distributed one-by-one across the first installments.
 */
export function splitInstallments(totalCents: Cents, count: number): Cents[] {
  if (count <= 0) throw new Error("installment count must be >= 1");
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}
