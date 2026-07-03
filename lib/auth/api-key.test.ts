import { describe, it, expect } from "vitest"
import { generateApiKey, hashApiKey } from "@/lib/auth/api-key"

describe("generateApiKey", () => {
  it("produces a raw key prefixed with adj_ and a matching hash/prefix", () => {
    const { raw, hash, prefix } = generateApiKey()

    expect(raw.startsWith("adj_")).toBe(true)
    expect(prefix).toBe(raw.slice(0, 12))
    expect(hash).toBe(hashApiKey(raw))
  })

  it("never generates the same raw key twice", () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a.raw).not.toBe(b.raw)
  })
})

describe("hashApiKey", () => {
  it("is deterministic for the same input", () => {
    expect(hashApiKey("adj_same-value")).toBe(hashApiKey("adj_same-value"))
  })

  it("produces different hashes for different inputs", () => {
    expect(hashApiKey("adj_a")).not.toBe(hashApiKey("adj_b"))
  })

  it("never stores the raw key in the hash output", () => {
    const raw = "adj_super-secret-value"
    expect(hashApiKey(raw)).not.toContain(raw)
  })
})
