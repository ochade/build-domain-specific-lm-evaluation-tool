import { describe, it, expect } from "vitest"
import { estimateCostUsd } from "@/lib/ai/config"

describe("estimateCostUsd", () => {
  it("returns null for an unknown model", () => {
    expect(estimateCostUsd("openai/some-unpriced-model", 1000, 1000)).toBeNull()
  })

  it("returns null when inputTokens is null", () => {
    expect(estimateCostUsd("openai/gpt-5-mini", null, 1000)).toBeNull()
  })

  it("computes cost from input tokens only when outputTokens is null (e.g. embeddings)", () => {
    // text-embedding-3-small: $0.02 / 1M input tokens, $0 output
    const cost = estimateCostUsd("openai/text-embedding-3-small", 1_000_000, null)
    expect(cost).toBeCloseTo(0.02, 6)
  })

  it("computes combined input+output cost for a chat/judge model", () => {
    // gpt-5-mini: $0.25 / 1M input, $2.00 / 1M output
    const cost = estimateCostUsd("openai/gpt-5-mini", 1_000_000, 1_000_000)
    expect(cost).toBeCloseTo(2.25, 6)
  })

  it("returns 0 for zero tokens rather than null", () => {
    expect(estimateCostUsd("openai/gpt-5-mini", 0, 0)).toBe(0)
  })
})
