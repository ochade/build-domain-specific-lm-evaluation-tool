import { z } from "zod"

// Shared schema for the live "agent-as-judge" evaluation result.
// Used by the API route (Output.object) and the client (useObject).

export const verdictEnum = z.enum(["supported", "hallucinated", "unsupported", "retrieval-gap"])

export const evalClaimSchema = z.object({
  text: z.string().describe("The atomic, independently verifiable claim extracted from the response."),
  verdict: verdictEnum.describe(
    "supported = entailed by evidence; hallucinated = contradicts evidence; unsupported = no evidence either way but plausibly wrong/risky; retrieval-gap = correct topic missing from sources, likely a retrieval failure not a fabrication.",
  ),
  confidence: z.number().describe("Judge confidence in the verdict, 0-100."),
  stage: z.string().describe("Name of the domain reasoning stage this claim belongs to."),
  evidence: z.string().describe("The supporting or contradicting evidence span / reasoning the verdict is based on."),
  rationale: z.string().describe("One-sentence justification for the verdict."),
})

export const evalStageSchema = z.object({
  name: z.string(),
  coverage: z.number().describe("How well the response covered this reasoning stage, 0-100."),
  status: z.enum(["strong", "partial", "weak"]),
  note: z.string().describe("Short note on what was covered or missing."),
})

export const evalImprovementSchema = z.object({
  severity: z.enum(["critical", "major", "minor"]),
  category: z.string().describe("e.g. Factuality, Specificity, Retrieval."),
  title: z.string(),
  detail: z.string(),
  recommendation: z.string().describe("Concrete, root-cause-tagged fix for the vendor."),
})

export const evaluationResultSchema = z.object({
  summary: z.string().describe("A 1-2 sentence verdict summary of the response quality."),
  factuality: z.number().describe("Overall factuality score, 0-100."),
  specificity: z.number().describe("Domain-appropriate depth & granularity score, 0-100."),
  hallucinationRate: z.number().describe("Percentage of claims that are hallucinated or unsupported, 0-100."),
  confidence: z.number().describe("Overall judge confidence, 0-100."),
  claims: z.array(evalClaimSchema),
  stages: z.array(evalStageSchema),
  improvements: z.array(evalImprovementSchema),
})

export type EvaluationResult = z.infer<typeof evaluationResultSchema>
export type EvalClaim = z.infer<typeof evalClaimSchema>

// --- Multi-step judge pipeline ---
// Call 1 (decompose, not shown to the client) splits the response into
// atomic claims and assigns each a stage name. Call 2 (verify+diagnose,
// streamed to the client) is given each claim + its own per-claim retrieved
// evidence, and echoes text/stage back verbatim alongside the verdict
// fields — keeping the streamed object self-contained so the client-side
// rendering needs no awareness of the two-call split.

export const decomposeClaimSchema = z.object({
  id: z.string().describe("Short stable id for this claim, e.g. 'c1', 'c2', assigned sequentially."),
  text: z.string().describe("The atomic, independently verifiable claim extracted from the response."),
  stage: z.string().describe("Name of the domain reasoning stage this claim belongs to."),
})

export const decomposeResultSchema = z.object({
  claims: z.array(decomposeClaimSchema),
})

export type DecomposeClaim = z.infer<typeof decomposeClaimSchema>
export type DecomposeResult = z.infer<typeof decomposeResultSchema>

export const verifyClaimSchema = decomposeClaimSchema.extend({
  verdict: verdictEnum.describe(
    "supported = entailed by evidence; hallucinated = contradicts evidence; unsupported = no evidence either way but plausibly wrong/risky; retrieval-gap = correct topic missing from sources, likely a retrieval failure not a fabrication.",
  ),
  confidence: z.number().describe("Judge confidence in this claim's verdict, 0-100."),
  evidence: z.string().describe("The supporting or contradicting evidence span / reasoning the verdict is based on."),
  rationale: z.string().describe("One-sentence justification for the verdict."),
})

export const verifyResultSchema = z.object({
  summary: z.string().describe("A 1-2 sentence verdict summary of the response quality."),
  specificity: z.number().describe("Domain-appropriate depth & granularity score, 0-100."),
  claims: z.array(verifyClaimSchema),
  stages: z.array(evalStageSchema),
  improvements: z.array(evalImprovementSchema),
})

export type VerifyClaim = z.infer<typeof verifyClaimSchema>
export type VerifyResult = z.infer<typeof verifyResultSchema>

export interface DeterministicScores {
  factuality: number
  hallucinationRate: number
  confidence: number
}

// Computes the trust-critical top-line metrics straight from per-claim
// verdicts/confidences instead of trusting the LLM's self-report. Shared by
// the server (authoritative persisted values) and the live-streaming UI
// (progressive display), so both are always consistent by construction.
export function computeDeterministicScores(
  claims: { verdict: string; confidence: number }[],
): DeterministicScores {
  if (claims.length === 0) return { factuality: 0, hallucinationRate: 0, confidence: 0 }

  const supported = claims.filter((c) => c.verdict === "supported").length
  const hallucinatedOrUnsupported = claims.filter(
    (c) => c.verdict === "hallucinated" || c.verdict === "unsupported",
  ).length
  const avgConfidence = claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length

  return {
    factuality: Math.round((supported / claims.length) * 100),
    hallucinationRate: Math.round((hallucinatedOrUnsupported / claims.length) * 100),
    confidence: Math.round(avgConfidence),
  }
}

// Schema for deriving a domain reasoning map from a vendor's declared spec.
export const derivedStageSchema = z.object({
  name: z.string().describe("Concise stage name, e.g. 'Recognition & Triage'."),
  description: z.string().describe("One sentence describing the reasoning performed at this stage."),
  expected: z.array(z.string()).describe("3-5 expected reasoning steps / outputs a strong answer must include."),
})

export const domainMapSchema = z.object({
  domainSummary: z.string().describe("A 1-2 sentence characterization of the domain and its reasoning shape."),
  stages: z.array(derivedStageSchema).describe("The ordered reasoning stages that structure this domain."),
})

export type DomainMap = z.infer<typeof domainMapSchema>
