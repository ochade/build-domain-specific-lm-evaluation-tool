import { describe, it, expect, vi, beforeEach } from "vitest"

// Mocks are hoisted above imports by Vitest; vi.hoisted() lets us declare the
// mock fns referenced inside the (also hoisted) vi.mock factories below.
const { authMock, insertRegisteredModelMock, logLlmCallMock, generateTextMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  insertRegisteredModelMock: vi.fn(),
  logLlmCallMock: vi.fn(),
  generateTextMock: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ auth: authMock }))
vi.mock("@/lib/db/queries", () => ({ insertRegisteredModel: insertRegisteredModelMock }))
vi.mock("@/lib/ai/log", () => ({ logLlmCall: logLlmCallMock }))
vi.mock("ai", async (importOriginal) => {
  const original = await importOriginal<typeof import("ai")>()
  return { ...original, generateText: generateTextMock }
})

const fakeSession = { user: { id: "u1", organizationId: "org-1", organizationName: "Org", email: "a@b.com" } }

function makeRequest(body: object) {
  return new Request("http://localhost/api/derive-map", { method: "POST", body: JSON.stringify(body) })
}

async function loadRoute(fallbackModel = "") {
  vi.resetModules()
  vi.doMock("@/lib/ai/config", () => ({
    JUDGE_MODEL: "primary-model",
    JUDGE_FALLBACK_MODEL: fallbackModel,
    JUDGE_TIMEOUT_MS: 1000,
    JUDGE_MAX_RETRIES: 0,
  }))
  const mod = await import("@/app/api/derive-map/route")
  return mod.POST
}

beforeEach(() => {
  vi.clearAllMocks()
  insertRegisteredModelMock.mockResolvedValue({ id: "model-1" })
})

describe("POST /api/derive-map", () => {
  it("returns 401 and never calls the model when there is no session", async () => {
    authMock.mockResolvedValue(null)
    const POST = await loadRoute()

    const res = await POST(makeRequest({ domain: "Cardiology", spec: "spec" }))

    expect(res.status).toBe(401)
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it("succeeds with the primary model and logs a successful call", async () => {
    authMock.mockResolvedValue(fakeSession)
    generateTextMock.mockResolvedValue({
      usage: { inputTokens: 10, outputTokens: 20 },
      output: { domainSummary: "s", stages: [] },
    })
    const POST = await loadRoute()

    const res = await POST(makeRequest({ model: "TestModel", domain: "Cardiology", spec: "spec" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.id).toBe("model-1")
    expect(generateTextMock).toHaveBeenCalledTimes(1)
    expect(generateTextMock.mock.calls[0][0].model).toBe("primary-model")
    expect(logLlmCallMock).toHaveBeenCalledWith(expect.objectContaining({ success: true, model: "primary-model" }))
  })

  it("falls back to the secondary model when the primary fails, and still returns 200", async () => {
    authMock.mockResolvedValue(fakeSession)
    generateTextMock
      .mockRejectedValueOnce(new Error("primary model unavailable"))
      .mockResolvedValueOnce({ usage: { inputTokens: 5, outputTokens: 5 }, output: { domainSummary: "s", stages: [] } })
    const POST = await loadRoute("fallback-model")

    const res = await POST(makeRequest({ model: "TestModel", domain: "Cardiology", spec: "spec" }))

    expect(res.status).toBe(200)
    expect(generateTextMock).toHaveBeenCalledTimes(2)
    expect(generateTextMock.mock.calls[0][0].model).toBe("primary-model")
    expect(generateTextMock.mock.calls[1][0].model).toBe("fallback-model")
    expect(logLlmCallMock).toHaveBeenCalledWith(expect.objectContaining({ success: false, model: "primary-model" }))
    expect(logLlmCallMock).toHaveBeenCalledWith(expect.objectContaining({ success: true, model: "fallback-model" }))
  })

  it("returns a clean 502 (not an uncaught throw) when there is no fallback and the model fails", async () => {
    // Regression test: a raw provider error (e.g. a timeout AbortError) must
    // never escape the route uncaught — that previously crashed Next's own
    // error handling instead of producing a normal error response.
    authMock.mockResolvedValue(fakeSession)
    generateTextMock.mockRejectedValue(new Error("timed out"))
    const POST = await loadRoute("") // no fallback configured

    const res = await POST(makeRequest({ model: "TestModel", domain: "Cardiology", spec: "spec" }))

    expect(res.status).toBe(502)
    expect(generateTextMock).toHaveBeenCalledTimes(1)
    expect(logLlmCallMock).toHaveBeenCalledWith(expect.objectContaining({ success: false, model: "primary-model" }))
    expect(insertRegisteredModelMock).not.toHaveBeenCalled()
  })
})
