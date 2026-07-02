import { describe, it, expect } from "vitest"
import { createTestOrg, createTestUser, makeEvaluationResult } from "@/lib/db/test-helpers"
import {
  insertRegisteredModel,
  listRegisteredModels,
  getRegisteredModel,
  insertRun,
  listRuns,
  getRun,
  getLatestRun,
  upsertClaimReview,
  listClaimReviews,
  getCalibrationSummary,
  getTotalJudgedClaimsCount,
} from "@/lib/db/queries"

// This suite mirrors every "sign up a second org and confirm it sees nothing"
// check performed by hand throughout development — automated so a future
// regression is caught by `pnpm test`, not by re-deriving it manually.

describe("organization isolation", () => {
  it("registered models are invisible to a different org", async () => {
    const orgA = await createTestOrg("Org A")
    const orgB = await createTestOrg("Org B")

    const model = await insertRegisteredModel(orgA.id, {
      model: "TestModel",
      domain: "Cardiology",
      audience: "Expert",
      spec: "spec",
      map: { domainSummary: "summary", stages: [{ name: "Triage", description: "d", expected: [] }] },
    })

    expect(await listRegisteredModels(orgA.id)).toHaveLength(1)
    expect(await listRegisteredModels(orgB.id)).toHaveLength(0)
    expect(await getRegisteredModel(orgA.id, model.id)).toBeDefined()
    expect(await getRegisteredModel(orgB.id, model.id)).toBeUndefined()
  })

  it("evaluation runs are invisible to a different org", async () => {
    const orgA = await createTestOrg("Org A")
    const orgB = await createTestOrg("Org B")

    const run = await insertRun(orgA.id, {
      registeredModelId: null,
      model: "TestModel",
      domain: "Cardiology",
      spec: "spec",
      prompt: "prompt",
      response: "response",
      sources: null,
      durationMs: 1000,
      result: makeEvaluationResult(),
      retrievedEvidence: [],
    })

    expect(await listRuns(orgA.id)).toHaveLength(1)
    expect(await listRuns(orgB.id)).toHaveLength(0)
    expect(await getRun(orgA.id, run.id)).toBeDefined()
    expect(await getRun(orgB.id, run.id)).toBeUndefined()
    expect(await getLatestRun(orgA.id)).toBeDefined()
    expect(await getLatestRun(orgB.id)).toBeUndefined()
  })

  it("claim reviews and calibration data are invisible to a different org", async () => {
    const orgA = await createTestOrg("Org A")
    const orgB = await createTestOrg("Org B")
    const userA = await createTestUser(orgA.id)

    const run = await insertRun(orgA.id, {
      registeredModelId: null,
      model: "TestModel",
      domain: "Cardiology",
      spec: "spec",
      prompt: "prompt",
      response: "response",
      sources: null,
      durationMs: 1000,
      result: makeEvaluationResult(),
      retrievedEvidence: [],
    })
    const claimId = run.claims[0].id

    await upsertClaimReview(orgA.id, userA.id, { runId: run.id, claimId, humanVerdict: "supported", note: null })

    expect(await listClaimReviews(orgA.id, run.id)).toHaveLength(1)
    expect(await listClaimReviews(orgB.id, run.id)).toHaveLength(0)

    const calibrationA = await getCalibrationSummary(orgA.id)
    const calibrationB = await getCalibrationSummary(orgB.id)
    expect(calibrationA.totalReviewed).toBe(1)
    expect(calibrationB.totalReviewed).toBe(0)

    expect(await getTotalJudgedClaimsCount(orgA.id)).toBe(run.claims.length)
    expect(await getTotalJudgedClaimsCount(orgB.id)).toBe(0)
  })

  it("upsertClaimReview refuses to attach a review to another org's run", async () => {
    const orgA = await createTestOrg("Org A")
    const orgB = await createTestOrg("Org B")
    const userB = await createTestUser(orgB.id)

    const run = await insertRun(orgA.id, {
      registeredModelId: null,
      model: "TestModel",
      domain: "Cardiology",
      spec: "spec",
      prompt: "prompt",
      response: "response",
      sources: null,
      durationMs: 1000,
      result: makeEvaluationResult(),
      retrievedEvidence: [],
    })

    await expect(
      upsertClaimReview(orgB.id, userB.id, { runId: run.id, claimId: run.claims[0].id, humanVerdict: "supported", note: null }),
    ).rejects.toThrow(/not found/i)
  })
})
