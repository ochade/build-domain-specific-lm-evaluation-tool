// Shared types for the Adjudica "Agent-as-Judge" platform.
// Real data is persisted in Postgres (see lib/db) — this file holds only
// type definitions and the static verdict-tone lookup table.

export type Verdict = "supported" | "hallucinated" | "unsupported" | "retrieval-gap"

export interface ScoreMetric {
  key: string
  label: string
  value: number // 0-100
  delta: number // vs previous run
  caption: string
}

export interface DomainStage {
  id: string
  name: string
  description: string
  coverage: number // 0-100, how well the model covered this reasoning step
  status: "strong" | "partial" | "weak"
  expected: string[]
}

export interface Claim {
  id: string
  text: string
  verdict: Verdict
  confidence: number // judge confidence 0-100
  stageId: string
  evidence: string
  rationale: string
  evidenceGrounded: boolean // mechanically verified: does `evidence` cite a real retrieved [E#] chunk?
}

export interface RetrievedEvidenceChunk {
  tag: string // e.g. "E1"
  documentTitle: string
  content: string
}

export interface TranscriptSegment {
  text: string
  claimId?: string
}

export interface Improvement {
  id: string
  severity: "critical" | "major" | "minor"
  category: string
  title: string
  detail: string
  recommendation: string
}

export interface RunSummary {
  id: string
  version: string
  date: string
  factuality: number
  specificity: number
  hallucinationRate: number
  agreement: number
  claimCounts: { supported: number; hallucinated: number; unsupported: number; "retrieval-gap": number }
  stageCoverage: Record<string, number> // stage name -> coverage
}

export const verdictMeta: Record<
  Verdict,
  { label: string; tone: "success" | "warning" | "destructive" | "muted" }
> = {
  supported: { label: "Supported", tone: "success" },
  hallucinated: { label: "Hallucinated", tone: "destructive" },
  unsupported: { label: "Unsupported", tone: "warning" },
  "retrieval-gap": { label: "Retrieval Gap", tone: "muted" },
}
