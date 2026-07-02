import { describe, it, expect } from "vitest"
import { toScoreMetrics, toRunSummary, computeCalibrationBuckets } from "@/lib/db/queries"
import type { EvaluationRunRow } from "@/lib/db/schema"
import type { Claim, DomainStage } from "@/lib/data"

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: "c1",
    text: "A claim.",
    verdict: "supported",
    confidence: 90,
    stageId: "s1",
    evidence: "[E1] some evidence",
    rationale: "because",
    evidenceGrounded: true,
    ...overrides,
  }
}

function makeStage(overrides: Partial<DomainStage> = {}): DomainStage {
  return {
    id: "s1",
    name: "Triage",
    description: "desc",
    coverage: 80,
    status: "strong",
    expected: [],
    ...overrides,
  }
}

function makeRun(overrides: Partial<EvaluationRunRow> = {}): EvaluationRunRow {
  return {
    id: "run-1",
    createdAt: new Date("2026-06-01T00:00:00Z"),
    organizationId: "org-1",
    registeredModelId: null,
    model: "TestModel",
    domain: "Test Domain",
    spec: "spec",
    prompt: "prompt",
    response: "response",
    sources: null,
    summary: "summary",
    factuality: 80,
    specificity: 70,
    hallucinationRate: 10,
    confidence: 90,
    durationMs: 1000,
    claims: [makeClaim()],
    stages: [makeStage()],
    improvements: [],
    transcript: null,
    retrievedEvidence: null,
    ...overrides,
  }
}

describe("toScoreMetrics", () => {
  it("computes zero deltas when there is no previous run", () => {
    const metrics = toScoreMetrics(makeRun(), undefined)
    for (const m of metrics) {
      expect(m.delta).toBe(0)
    }
  })

  it("computes deltas against the previous run for each metric", () => {
    const previous = makeRun({ factuality: 70, specificity: 60, hallucinationRate: 20, confidence: 80 })
    const current = makeRun({ factuality: 80, specificity: 65, hallucinationRate: 15, confidence: 85 })
    const metrics = toScoreMetrics(current, previous)

    expect(metrics.find((m) => m.key === "factuality")?.delta).toBe(10)
    expect(metrics.find((m) => m.key === "specificity")?.delta).toBe(5)
    expect(metrics.find((m) => m.key === "hallucination")?.delta).toBe(-5)
    expect(metrics.find((m) => m.key === "confidence")?.delta).toBe(5)
  })
})

describe("toRunSummary", () => {
  it("tallies claim verdicts into claimCounts", () => {
    const run = makeRun({
      claims: [
        makeClaim({ id: "c1", verdict: "supported" }),
        makeClaim({ id: "c2", verdict: "supported" }),
        makeClaim({ id: "c3", verdict: "hallucinated" }),
        makeClaim({ id: "c4", verdict: "retrieval-gap" }),
      ],
    })
    const summary = toRunSummary(run)
    expect(summary.claimCounts).toEqual({ supported: 2, hallucinated: 1, unsupported: 0, "retrieval-gap": 1 })
  })

  it("maps stage coverage by stage name", () => {
    const run = makeRun({
      stages: [makeStage({ name: "Triage", coverage: 90 }), makeStage({ name: "Diagnostics", coverage: 40 })],
    })
    const summary = toRunSummary(run)
    expect(summary.stageCoverage).toEqual({ Triage: 90, Diagnostics: 40 })
  })

  it("derives version/date/agreement from the run row", () => {
    const run = makeRun({ model: "CardioScribe-3B v1.0", confidence: 88 })
    const summary = toRunSummary(run)
    expect(summary.version).toBe("CardioScribe-3B v1.0")
    expect(summary.date).toBe("2026-06-01")
    expect(summary.agreement).toBe(88)
  })
})

describe("computeCalibrationBuckets", () => {
  it("returns null agreementRate for empty buckets, not zero", () => {
    const buckets = computeCalibrationBuckets([])
    for (const b of buckets) {
      expect(b.count).toBe(0)
      expect(b.agreementRate).toBeNull()
    }
  })

  it("buckets by confidence boundary correctly", () => {
    const rows = [
      { judgeConfidence: 59, agrees: true },
      { judgeConfidence: 60, agrees: true },
      { judgeConfidence: 89, agrees: false },
      { judgeConfidence: 90, agrees: true },
      { judgeConfidence: 100, agrees: false },
    ]
    const buckets = computeCalibrationBuckets(rows)
    expect(buckets.find((b) => b.label === "0-59%")?.count).toBe(1)
    expect(buckets.find((b) => b.label === "60-79%")?.count).toBe(1)
    expect(buckets.find((b) => b.label === "80-89%")?.count).toBe(1)
    expect(buckets.find((b) => b.label === "90-100%")?.count).toBe(2)
    expect(buckets.find((b) => b.label === "90-100%")?.agreementRate).toBe(50)
  })
})
