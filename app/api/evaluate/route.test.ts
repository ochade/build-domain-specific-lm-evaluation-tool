import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/evaluate/route"

const {
  authMock,
  authenticateApiKeyMock,
  insertRunMock,
  retrieveEvidenceMock,
  countLlmCallsSinceMock,
  logLlmCallMock,
  streamTextMock,
  generateObjectMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  authenticateApiKeyMock: vi.fn(),
  insertRunMock: vi.fn(),
  retrieveEvidenceMock: vi.fn(),
  countLlmCallsSinceMock: vi.fn(),
  logLlmCallMock: vi.fn(),
  streamTextMock: vi.fn(),
  generateObjectMock: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ auth: authMock }))
vi.mock("@/lib/auth/api-key", () => ({ authenticateApiKey: authenticateApiKeyMock }))
vi.mock("@/lib/db/queries", () => ({
  insertRun: insertRunMock,
  retrieveEvidence: retrieveEvidenceMock,
  countLlmCallsSince: countLlmCallsSinceMock,
}))
vi.mock("@/lib/ai/log", () => ({ logLlmCall: logLlmCallMock }))
vi.mock("@/lib/ai/config", () => ({
  JUDGE_MODEL: "primary-model",
  JUDGE_DECOMPOSE_MODEL: "",
  JUDGE_TIMEOUT_MS: 12345,
  JUDGE_DECOMPOSE_TIMEOUT_MS: 6789,
  JUDGE_MAX_RETRIES: 7,
  RATE_LIMIT_EVALUATE_PER_HOUR: 20,
}))
vi.mock("ai", async (importOriginal) => {
  const original = await importOriginal<typeof import("ai")>()
  return { ...original, streamText: streamTextMock, generateObject: generateObjectMock }
})

const fakeSession = { user: { id: "u1", organizationId: "org-1", organizationName: "Org", email: "a@b.com" } }

function makeRequest(body: object) {
  return new Request("http://localhost/api/evaluate", { method: "POST", body: JSON.stringify(body) })
}

function makeDecomposeResult(claims: { id: string; text: string; stage: string }[] = [{ id: "c1", text: "A claim.", stage: "Triage" }]) {
  return { object: { claims }, usage: { inputTokens: 1, outputTokens: 1 } }
}

function makeVerifyOutput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    summary: "ok",
    specificity: 70,
    claims: [
      { id: "c1", text: "A claim.", stage: "Triage", verdict: "supported", confidence: 90, evidence: "[E1]", rationale: "because" },
    ],
    stages: [],
    improvements: [],
    ...overrides,
  }
}

function makeStreamTextResult(overrides: { output?: unknown; usage?: unknown; outputDelayMs?: number } = {}) {
  const delay = overrides.outputDelayMs ?? 0
  const outputValue = overrides.output ?? makeVerifyOutput()
  const output = delay > 0 ? new Promise((r) => setTimeout(() => r(outputValue), delay)) : Promise.resolve(outputValue)
  return {
    output,
    usage: Promise.resolve(overrides.usage ?? { inputTokens: 1, outputTokens: 1 }),
    toTextStreamResponse: () => new Response("stream", { status: 200 }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  retrieveEvidenceMock.mockResolvedValue([])
  insertRunMock.mockResolvedValue({ id: "run-1" })
  countLlmCallsSinceMock.mockResolvedValue(0)
  authenticateApiKeyMock.mockResolvedValue(null)
  generateObjectMock.mockResolvedValue(makeDecomposeResult())
  streamTextMock.mockReturnValue(makeStreamTextResult())
})

describe("POST /api/evaluate", () => {
  it("returns 401 and never calls the model when there is no session", async () => {
    authMock.mockResolvedValue(null)

    const res = await POST(makeRequest({ domain: "Cardiology", prompt: "p", response: "r" }))

    expect(res.status).toBe(401)
    expect(generateObjectMock).not.toHaveBeenCalled()
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it("returns 400 and never calls the model when required fields are missing", async () => {
    authMock.mockResolvedValue(fakeSession)

    const res = await POST(makeRequest({ domain: "Cardiology" })) // missing prompt/response
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.details).toBeTruthy()
    expect(generateObjectMock).not.toHaveBeenCalled()
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it("returns 429 and never calls the model when the org is over its rate limit", async () => {
    authMock.mockResolvedValue(fakeSession)
    countLlmCallsSinceMock.mockResolvedValue(20) // == RATE_LIMIT_EVALUATE_PER_HOUR

    const res = await POST(makeRequest({ model: "TestModel", domain: "Cardiology", prompt: "p", response: "r" }))

    expect(res.status).toBe(429)
    expect(generateObjectMock).not.toHaveBeenCalled()
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it("decomposes first, retrieves evidence per claim, then verifies — in that order", async () => {
    authMock.mockResolvedValue(fakeSession)
    generateObjectMock.mockResolvedValue(
      makeDecomposeResult([
        { id: "c1", text: "First claim.", stage: "Triage" },
        { id: "c2", text: "Second claim.", stage: "Diagnostics" },
      ]),
    )

    await POST(makeRequest({ model: "TestModel", domain: "Cardiology", prompt: "p", response: "r" }))

    expect(generateObjectMock).toHaveBeenCalledTimes(1)
    const decomposeArgs = generateObjectMock.mock.calls[0][0]
    expect(decomposeArgs.model).toBe("primary-model") // JUDGE_DECOMPOSE_MODEL is "" so it falls back to JUDGE_MODEL
    expect(decomposeArgs.timeout).toBe(6789)

    // One retrieveEvidence call per decomposed claim, with non-overlapping tag offsets.
    expect(retrieveEvidenceMock).toHaveBeenCalledTimes(2)
    expect(retrieveEvidenceMock).toHaveBeenNthCalledWith(1, "org-1", "Cardiology", "First claim.", 4, 0)
    expect(retrieveEvidenceMock).toHaveBeenNthCalledWith(2, "org-1", "Cardiology", "Second claim.", 4, 4)

    expect(streamTextMock).toHaveBeenCalledTimes(1)
    const verifyArgs = streamTextMock.mock.calls[0][0]
    expect(verifyArgs.model).toBe("primary-model")
    expect(verifyArgs.maxRetries).toBe(7)
    expect(verifyArgs.timeout).toBe(12345)
    // The verify prompt must carry both claims through to the second call.
    expect(verifyArgs.prompt).toContain("First claim.")
    expect(verifyArgs.prompt).toContain("Second claim.")
  })

  it("logs two separate llm_calls rows — one for decompose, one for verify", async () => {
    authMock.mockResolvedValue(fakeSession)

    await POST(makeRequest({ model: "TestModel", domain: "Cardiology", prompt: "p", response: "r" }))
    await new Promise((r) => setTimeout(r, 10))

    expect(logLlmCallMock).toHaveBeenCalledTimes(2)
    expect(logLlmCallMock).toHaveBeenCalledWith(expect.objectContaining({ model: "primary-model", success: true }))
  })

  it("computes factuality/hallucinationRate/confidence deterministically instead of trusting the LLM", async () => {
    authMock.mockResolvedValue(fakeSession)
    generateObjectMock.mockResolvedValue(
      makeDecomposeResult([
        { id: "c1", text: "Claim 1", stage: "Triage" },
        { id: "c2", text: "Claim 2", stage: "Triage" },
      ]),
    )
    streamTextMock.mockReturnValue(
      makeStreamTextResult({
        output: makeVerifyOutput({
          claims: [
            { id: "c1", text: "Claim 1", stage: "Triage", verdict: "supported", confidence: 100, evidence: "[E1]", rationale: "r" },
            { id: "c2", text: "Claim 2", stage: "Triage", verdict: "hallucinated", confidence: 50, evidence: "[E2]", rationale: "r" },
          ],
        }),
      }),
    )

    await POST(makeRequest({ model: "TestModel", domain: "Cardiology", prompt: "p", response: "r" }))
    await new Promise((r) => setTimeout(r, 10))

    const persisted = insertRunMock.mock.calls[0][1].result
    expect(persisted.factuality).toBe(50) // 1/2 supported
    expect(persisted.hallucinationRate).toBe(50) // 1/2 hallucinated
    expect(persisted.confidence).toBe(75) // average of 100, 50
  })

  it("returns 502 and logs a failed decompose call when decomposition fails, without ever calling streamText", async () => {
    authMock.mockResolvedValue(fakeSession)
    generateObjectMock.mockRejectedValue(new Error("decompose exploded"))

    const res = await POST(makeRequest({ model: "TestModel", domain: "Cardiology", prompt: "p", response: "r" }))

    expect(res.status).toBe(502)
    expect(streamTextMock).not.toHaveBeenCalled()
    expect(logLlmCallMock).toHaveBeenCalledWith(expect.objectContaining({ success: false }))
  })

  it("returns the stream response immediately without waiting for the background persist/log to finish", async () => {
    authMock.mockResolvedValue(fakeSession)
    // Output resolves after the response would already have been returned.
    streamTextMock.mockReturnValue(makeStreamTextResult({ outputDelayMs: 20 }))

    const res = await POST(makeRequest({ model: "TestModel", domain: "Cardiology", prompt: "p", response: "r" }))

    expect(res.status).toBe(200)
    // At this point the background IIFE's awaited `result.output` (20ms delay)
    // has not resolved yet, so persistence must not have happened yet.
    expect(insertRunMock).not.toHaveBeenCalled()

    await new Promise((r) => setTimeout(r, 40))
    expect(insertRunMock).toHaveBeenCalledTimes(1)
    expect(logLlmCallMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it("logs a failed call and does not throw when the verify call fails", async () => {
    authMock.mockResolvedValue(fakeSession)
    const failingResult = makeStreamTextResult()
    failingResult.output = Promise.reject(new Error("model exploded"))
    streamTextMock.mockReturnValue(failingResult)

    const res = await POST(makeRequest({ model: "TestModel", domain: "Cardiology", prompt: "p", response: "r" }))
    expect(res.status).toBe(200) // the stream response itself is still returned

    await new Promise((r) => setTimeout(r, 10))
    expect(logLlmCallMock).toHaveBeenCalledWith(expect.objectContaining({ success: false }))
    expect(insertRunMock).not.toHaveBeenCalled()
  })

  describe("API-key authentication (CI callers)", () => {
    it("returns a synchronous JSON response with runId instead of a stream", async () => {
      authMock.mockResolvedValue(null)
      authenticateApiKeyMock.mockResolvedValue({ organizationId: "org-1", apiKeyId: "key-1" })
      insertRunMock.mockResolvedValue({ id: "run-42" })
      streamTextMock.mockReturnValue(makeStreamTextResult({ output: makeVerifyOutput({ summary: "ok" }) }))

      const res = await POST(makeRequest({ model: "TestModel", domain: "Cardiology", prompt: "p", response: "r" }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.runId).toBe("run-42")
      expect(body.summary).toBe("ok")
      expect(typeof body.factuality).toBe("number")
      // Unlike the session/streaming path, persistence already happened
      // before the response was returned — no need to wait for a detached IIFE.
      expect(insertRunMock).toHaveBeenCalledTimes(1)
      expect(logLlmCallMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it("still returns 401 when neither a session nor a valid API key is present", async () => {
      authMock.mockResolvedValue(null)
      authenticateApiKeyMock.mockResolvedValue(null)

      const res = await POST(makeRequest({ domain: "Cardiology", prompt: "p", response: "r" }))

      expect(res.status).toBe(401)
      expect(streamTextMock).not.toHaveBeenCalled()
    })

    it("returns a 502 and logs a failed call when the judge call fails for an API-key caller", async () => {
      authMock.mockResolvedValue(null)
      authenticateApiKeyMock.mockResolvedValue({ organizationId: "org-1", apiKeyId: "key-1" })
      const failingResult = makeStreamTextResult()
      failingResult.output = Promise.reject(new Error("model exploded"))
      streamTextMock.mockReturnValue(failingResult)

      const res = await POST(makeRequest({ model: "TestModel", domain: "Cardiology", prompt: "p", response: "r" }))

      expect(res.status).toBe(502)
      expect(logLlmCallMock).toHaveBeenCalledWith(expect.objectContaining({ success: false }))
      expect(insertRunMock).not.toHaveBeenCalled()
    })

    it("prefers session auth over an API key when both are somehow present", async () => {
      authMock.mockResolvedValue(fakeSession)
      authenticateApiKeyMock.mockResolvedValue({ organizationId: "org-2", apiKeyId: "key-1" })

      const res = await POST(makeRequest({ model: "TestModel", domain: "Cardiology", prompt: "p", response: "r" }))

      expect(res.status).toBe(200)
      expect(authenticateApiKeyMock).not.toHaveBeenCalled()
    })
  })
})
