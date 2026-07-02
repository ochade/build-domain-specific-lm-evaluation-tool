import { describe, it, expect } from "vitest"
import { evaluationResultSchema, domainMapSchema } from "@/lib/eval-schema"

describe("evaluationResultSchema", () => {
  const validResult = {
    summary: "A summary.",
    factuality: 80,
    specificity: 70,
    hallucinationRate: 10,
    confidence: 90,
    claims: [
      {
        text: "A claim.",
        verdict: "supported",
        confidence: 90,
        stage: "Triage",
        evidence: "[E1]",
        rationale: "because",
      },
    ],
    stages: [{ name: "Triage", coverage: 90, status: "strong", note: "good" }],
    improvements: [],
  }

  it("accepts a valid evaluation result", () => {
    const result = evaluationResultSchema.safeParse(validResult)
    expect(result.success).toBe(true)
  })

  it("rejects an invalid verdict enum value", () => {
    const invalid = {
      ...validResult,
      claims: [{ ...validResult.claims[0], verdict: "definitely-true" }],
    }
    const result = evaluationResultSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("rejects an invalid stage status enum value", () => {
    const invalid = {
      ...validResult,
      stages: [{ ...validResult.stages[0], status: "excellent" }],
    }
    const result = evaluationResultSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("rejects a missing required field", () => {
    const { summary: _summary, ...invalid } = validResult
    const result = evaluationResultSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe("domainMapSchema", () => {
  it("accepts a valid domain map", () => {
    const result = domainMapSchema.safeParse({
      domainSummary: "A domain.",
      stages: [{ name: "Triage", description: "desc", expected: ["a", "b"] }],
    })
    expect(result.success).toBe(true)
  })

  it("rejects stages missing the expected array", () => {
    const result = domainMapSchema.safeParse({
      domainSummary: "A domain.",
      stages: [{ name: "Triage", description: "desc" }],
    })
    expect(result.success).toBe(false)
  })
})
