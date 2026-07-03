import { describe, it, expect } from "vitest"
import { createTestOrg } from "@/lib/db/test-helpers"
import { logLlmCall, type LogLlmCallInput } from "@/lib/ai/log"
import { checkOrgRateLimit } from "@/lib/api/rate-limit"
import { ApiError } from "@/lib/api/errors"

async function seedCalls(organizationId: string, route: LogLlmCallInput["route"], count: number) {
  for (let i = 0; i < count; i++) {
    await logLlmCall({ organizationId, route, model: "test-model", success: true, latencyMs: 1 })
  }
}

describe("checkOrgRateLimit (real Postgres via llm_calls)", () => {
  it("allows the call when the org is under quota", async () => {
    const org = await createTestOrg()
    await seedCalls(org.id, "evaluate", 2)

    await expect(checkOrgRateLimit(org.id, "evaluate", { max: 3, windowMs: 60_000 })).resolves.toBeUndefined()
  })

  it("throws a 429 ApiError once the org has hit its quota", async () => {
    const org = await createTestOrg()
    await seedCalls(org.id, "evaluate", 3)

    await expect(checkOrgRateLimit(org.id, "evaluate", { max: 3, windowMs: 60_000 })).rejects.toMatchObject({
      status: 429,
    })
  })

  it("only counts calls for the specified route, not other routes", async () => {
    const org = await createTestOrg()
    await seedCalls(org.id, "derive-map", 5) // different route, should not count toward "evaluate"

    await expect(checkOrgRateLimit(org.id, "evaluate", { max: 3, windowMs: 60_000 })).resolves.toBeUndefined()
  })

  it("only counts calls for the specified organization, not other orgs (isolation)", async () => {
    const orgA = await createTestOrg("Org A")
    const orgB = await createTestOrg("Org B")
    await seedCalls(orgA.id, "evaluate", 10)

    await expect(checkOrgRateLimit(orgB.id, "evaluate", { max: 3, windowMs: 60_000 })).resolves.toBeUndefined()
  })

  it("does not count calls outside the time window", async () => {
    const org = await createTestOrg()
    await seedCalls(org.id, "evaluate", 3)

    // A window of 0ms means "since right now" — the just-inserted rows (a few
    // ms in the past) should already fall outside it.
    await expect(checkOrgRateLimit(org.id, "evaluate", { max: 1, windowMs: 0 })).resolves.toBeUndefined()
  })
})

describe("checkOrgRateLimit error type", () => {
  it("throws an actual ApiError instance", async () => {
    const org = await createTestOrg()
    await seedCalls(org.id, "evaluate", 1)
    try {
      await checkOrgRateLimit(org.id, "evaluate", { max: 1, windowMs: 60_000 })
      expect.unreachable("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
    }
  })
})
