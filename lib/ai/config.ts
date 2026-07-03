export const JUDGE_MODEL = process.env.JUDGE_MODEL || "openai/gpt-5-mini"
export const JUDGE_FALLBACK_MODEL = process.env.JUDGE_FALLBACK_MODEL || ""
// The evaluate pipeline's decompose step (splitting a response into atomic
// claims) is structurally simple compared to verification — point it at a
// cheaper/faster model if you have one available. Falls back to JUDGE_MODEL
// if unset, so this requires no config changes to work.
export const JUDGE_DECOMPOSE_MODEL = process.env.JUDGE_DECOMPOSE_MODEL || ""
// gpt-5-mini is a reasoning model — structured-output calls can legitimately
// take 30-45s. Keep this comfortably under `maxDuration` (120s on /api/evaluate,
// which now makes two sequential model calls: decompose + verify); if you set
// JUDGE_FALLBACK_MODEL, lower this so a primary timeout plus a fallback
// attempt can both fit inside maxDuration.
export const JUDGE_TIMEOUT_MS = Number(process.env.JUDGE_TIMEOUT_MS) || 45000
// The decompose step needs much less time than full verification.
export const JUDGE_DECOMPOSE_TIMEOUT_MS = Number(process.env.JUDGE_DECOMPOSE_TIMEOUT_MS) || 20000
export const JUDGE_MAX_RETRIES = Number(process.env.JUDGE_MAX_RETRIES) || 2
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small"

export const RATE_LIMIT_EVALUATE_PER_HOUR = Number(process.env.RATE_LIMIT_EVALUATE_PER_HOUR) || 20
export const RATE_LIMIT_DERIVE_MAP_PER_HOUR = Number(process.env.RATE_LIMIT_DERIVE_MAP_PER_HOUR) || 10
export const RATE_LIMIT_SIGNUP_PER_HOUR = Number(process.env.RATE_LIMIT_SIGNUP_PER_HOUR) || 5

// Best-effort USD-per-1M-token estimates — NOT verified against a live invoice.
// Reconcile against your actual Vercel AI Gateway / OpenAI billing and adjust.
const PRICING: Record<string, { input: number; output: number }> = {
  "openai/gpt-5-mini": { input: 0.25, output: 2.0 },
  "openai/text-embedding-3-small": { input: 0.02, output: 0 },
}

export function estimateCostUsd(model: string, inputTokens: number | null, outputTokens: number | null): number | null {
  const pricing = PRICING[model]
  if (!pricing || inputTokens == null) return null
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = ((outputTokens ?? 0) / 1_000_000) * pricing.output
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000
}
