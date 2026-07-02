import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/evaluate/route"

const { authMock, insertRunMock, retrieveEvidenceMock, logLlmCallMock, streamTextMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  insertRunMock: vi.fn(),
  retrieveEvidenceMock: vi.fn(),
  logLlmCallMock: vi.fn(),
  streamTextMock: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ auth: authMock }))
vi.mock("@/lib/db/queries", () => ({ insertRun: insertRunMock, retrieveEvidence: retrieveEvidenceMock }))
vi.mock("@/lib/ai/log", () => ({ logLlmCall: logLlmCallMock }))
vi.mock("@/lib/ai/config", () => ({
  JUDGE_MODEL: "primary-model",
  JUDGE_TIMEOUT_MS: 12345,
  JUDGE_MAX_RETRIES: 7,
}))
vi.mock("ai", async (importOriginal) => {
  const original = await importOriginal<typeof import("ai")>()
  return { ...original, streamText: streamTextMock }
})

const fakeSession = { user: { id: "u1", organizationId: "org-1", organizationName: "Org", email: "a@b.com" } }

function makeRequest(body: object) {
  return new Request("http://localhost/api/evaluate", { method: "POST", body: JSON.stringify(body) })
}

function makeStreamTextResult(overrides: { output?: unknown; usage?: unknown; outputDelayMs?: number } = {}) {
  const delay = overrides.outputDelayMs ?? 0
  const output = delay > 0 ? new Promise((r) => setTimeout(() => r(overrides.output ?? {}), delay)) : Promise.resolve(overrides.output ?? {})
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
})

describe("POST /api/evaluate", () => {
  it("returns 401 and never calls the model when there is no session", async () => {
    authMock.mockResolvedValue(null)

    const res = await POST(makeRequest({ domain: "Cardiology", prompt: "p", response: "r" }))

    expect(res.status).toBe(401)
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it("passes maxRetries/timeout from config to streamText", async () => {
    authMock.mockResolvedValue(fakeSession)
    streamTextMock.mockReturnValue(makeStreamTextResult())

    await POST(makeRequest({ model: "TestModel", domain: "Cardiology", prompt: "p", response: "r" }))

    expect(streamTextMock).toHaveBeenCalledTimes(1)
    const callArgs = streamTextMock.mock.calls[0][0]
    expect(callArgs.model).toBe("primary-model")
    expect(callArgs.maxRetries).toBe(7)
    expect(callArgs.timeout).toBe(12345)
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

  it("logs a failed call and does not throw when the judge call fails", async () => {
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
})
