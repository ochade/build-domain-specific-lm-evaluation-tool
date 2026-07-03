import { describe, it, expect } from "vitest"
import { buildRunCsv } from "@/lib/reports/csv"
import type { EvaluationRunRow } from "@/lib/db/schema"

function makeRun(overrides: Partial<EvaluationRunRow> = {}): EvaluationRunRow {
  return {
    id: "run-1",
    createdAt: new Date("2026-06-01T00:00:00Z"),
    organizationId: "org-1",
    registeredModelId: null,
    model: "TestModel",
    domain: "Cardiology",
    spec: "spec",
    prompt: "prompt",
    response: "response",
    sources: null,
    summary: "A summary.",
    factuality: 80,
    specificity: 70,
    hallucinationRate: 10,
    confidence: 90,
    durationMs: 1000,
    claims: [],
    stages: [],
    improvements: [],
    transcript: null,
    retrievedEvidence: null,
    ...overrides,
  }
}

describe("buildRunCsv", () => {
  it("includes the run summary fields", () => {
    const csv = buildRunCsv(makeRun())
    expect(csv).toContain("TestModel")
    expect(csv).toContain("Cardiology")
    expect(csv).toContain("run-1")
    expect(csv).toContain("A summary.")
  })

  it("includes one row per claim, stage, and improvement", () => {
    const csv = buildRunCsv(
      makeRun({
        claims: [
          {
            id: "c1",
            text: "A claim.",
            verdict: "supported",
            confidence: 90,
            stageId: "s1",
            evidence: "[E1] evidence",
            rationale: "because",
            evidenceGrounded: true,
          },
        ],
        stages: [{ id: "s1", name: "Triage", description: "desc", coverage: 80, status: "strong", expected: [] }],
        improvements: [
          {
            id: "i1",
            severity: "major",
            category: "Safety",
            title: "Fix this",
            detail: "detail text",
            recommendation: "do the fix",
          },
        ],
      }),
    )

    expect(csv).toContain("A claim.")
    expect(csv).toContain("supported")
    expect(csv).toContain("Triage")
    expect(csv).toContain("Fix this")
    expect(csv).toContain("do the fix")
  })

  it("escapes fields containing commas, quotes, or newlines", () => {
    const csv = buildRunCsv(
      makeRun({
        claims: [
          {
            id: "c1",
            text: 'Contains, a comma and a "quote" and a\nnewline',
            verdict: "hallucinated",
            confidence: 50,
            stageId: "s1",
            evidence: "e",
            rationale: "r",
            evidenceGrounded: false,
          },
        ],
      }),
    )

    expect(csv).toContain('"Contains, a comma and a ""quote"" and a\nnewline"')
  })
})
