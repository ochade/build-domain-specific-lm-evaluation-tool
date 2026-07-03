import { describe, it, expect } from "vitest"
import {
  evaluationResultSchema,
  domainMapSchema,
  decomposeResultSchema,
  verifyResultSchema,
  computeDeterministicScores,
} from "@/lib/eval-schema"

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

describe("decomposeResultSchema", () => {
  it("accepts a valid decompose result", () => {
    const result = decomposeResultSchema.safeParse({
      claims: [{ id: "c1", text: "A claim.", stage: "Triage" }],
    })
    expect(result.success).toBe(true)
  })

  it("rejects a claim missing an id", () => {
    const result = decomposeResultSchema.safeParse({
      claims: [{ text: "A claim.", stage: "Triage" }],
    })
    expect(result.success).toBe(false)
  })
})

describe("verifyResultSchema", () => {
  it("accepts a valid verify result and does not require top-level factuality/hallucinationRate/confidence", () => {
    const result = verifyResultSchema.safeParse({
      summary: "A summary.",
      specificity: 70,
      claims: [
        { id: "c1", text: "A claim.", stage: "Triage", verdict: "supported", confidence: 90, evidence: "[E1]", rationale: "because" },
      ],
      stages: [{ name: "Triage", coverage: 90, status: "strong", note: "good" }],
      improvements: [],
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid verdict enum value", () => {
    const result = verifyResultSchema.safeParse({
      summary: "A summary.",
      specificity: 70,
      claims: [
        { id: "c1", text: "A claim.", stage: "Triage", verdict: "definitely-true", confidence: 90, evidence: "[E1]", rationale: "because" },
      ],
      stages: [],
      improvements: [],
    })
    expect(result.success).toBe(false)
  })
})

describe("computeDeterministicScores", () => {
  it("returns zeros for an empty claim list", () => {
    expect(computeDeterministicScores([])).toEqual({ factuality: 0, hallucinationRate: 0, confidence: 0 })
  })

  it("computes factuality as the share of supported claims", () => {
    const claims = [
      { verdict: "supported", confidence: 90 },
      { verdict: "supported", confidence: 80 },
      { verdict: "unsupported", confidence: 60 },
      { verdict: "hallucinated", confidence: 70 },
    ]
    const scores = computeDeterministicScores(claims)
    expect(scores.factuality).toBe(50) // 2/4
    expect(scores.hallucinationRate).toBe(50) // hallucinated + unsupported = 2/4
    expect(scores.confidence).toBe(75) // average of 90,80,60,70
  })

  it("treats retrieval-gap as neither factual nor hallucinated", () => {
    const claims = [
      { verdict: "supported", confidence: 100 },
      { verdict: "retrieval-gap", confidence: 50 },
    ]
    const scores = computeDeterministicScores(claims)
    expect(scores.factuality).toBe(50)
    expect(scores.hallucinationRate).toBe(0)
  })
})
