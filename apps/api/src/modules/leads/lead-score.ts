/**
 * Hybrid lead-score engine (spec §16): rule-based, deterministic, and does not
 * depend exclusively on the AI. AI-extracted signals feed into these same rules
 * as boolean facts rather than freeform point assignment, so scoring stays auditable.
 */
export const SCORE_RULES = {
  solicitou_orcamento: 20,
  explicou_necessidade: 15,
  informou_empresa: 10,
  indicou_prazo: 10,
  informou_orcamento: 15,
  solicitou_proposta: 20,
  respondeu_rapido: 5,
  dias_sem_responder: -10,
} as const;

export type ScoreRuleKey = keyof typeof SCORE_RULES;

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}
