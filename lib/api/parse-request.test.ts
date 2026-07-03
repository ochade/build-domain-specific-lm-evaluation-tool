import { describe, it, expect } from "vitest"
import { z } from "zod"
import { parseJsonBody } from "@/lib/api/parse-request"
import { ApiError } from "@/lib/api/errors"

const schema = z.object({ name: z.string().min(1).max(20) })

function makeRequest(body: string) {
  return new Request("http://localhost/test", { method: "POST", body })
}

describe("parseJsonBody", () => {
  it("returns the parsed, validated body on success", async () => {
    const result = await parseJsonBody(makeRequest(JSON.stringify({ name: "ok" })), schema, 1000)
    expect(result).toEqual({ name: "ok" })
  })

  it("throws a 400 ApiError for invalid JSON", async () => {
    await expect(parseJsonBody(makeRequest("{not json"), schema, 1000)).rejects.toMatchObject({
      status: 400,
    })
  })

  it("throws a 400 ApiError with issue details for a schema violation", async () => {
    try {
      await parseJsonBody(makeRequest(JSON.stringify({ name: "" })), schema, 1000)
      expect.unreachable("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).status).toBe(400)
      expect((err as ApiError).details).toBeTruthy()
    }
  })

  it("throws a 413 ApiError when the body exceeds the byte limit", async () => {
    const bigBody = JSON.stringify({ name: "x".repeat(2000) })
    await expect(parseJsonBody(makeRequest(bigBody), schema, 100)).rejects.toMatchObject({ status: 413 })
  })

  it("rejects an oversized body even if the schema would otherwise reject it too (size check happens first)", async () => {
    // Confirms we don't buffer/parse an oversized body before checking size.
    const bigBody = "x".repeat(10_000)
    await expect(parseJsonBody(makeRequest(bigBody), schema, 100)).rejects.toMatchObject({ status: 413 })
  })
})
