import { describe, it, expect } from "vitest"
import { createTestOrg, createTestUser, makeEvaluationResult } from "@/lib/db/test-helpers"
import { insertRun, upsertClaimReview, listClaimReviews, getCalibrationSummary } from "@/lib/db/queries"

async function setupRunWithClaim(orgId: string, confidence = 90) {
  const run = await insertRun(orgId, {
    registeredModelId: null,
    model: "TestModel",
    domain: "Cardiology",
    spec: "spec",
    prompt: "p",
    response: "r",
    sources: null,
    durationMs: 1,
    result: makeEvaluationResult({
      claims: [{ text: "A claim", verdict: "supported", confidence, stage: "Triage", evidence: "[E1]", rationale: "r" }],
    }),
    retrievedEvidence: [{ tag: "E1", documentTitle: "Doc", content: "text" }],
  })
  return { run, claimId: run.claims[0].id }
}

describe("upsertClaimReview", () => {
  it("creates a review and snapshots the judge's verdict/confidence at review time", async () => {
    const org = await createTestOrg()
    const user = await createTestUser(org.id)
    const { run, claimId } = await setupRunWithClaim(org.id, 92)

    const review = await upsertClaimReview(org.id, user.id, { runId: run.id, claimId, humanVerdict: "supported", note: null })

    expect(review.judgeVerdict).toBe("supported")
    expect(review.judgeConfidence).toBe(92)
    expect(review.agrees).toBe(true)
  })

  it("computes agrees=false when the human verdict differs from the judge's", async () => {
    const org = await createTestOrg()
    const user = await createTestUser(org.id)
    const { run, claimId } = await setupRunWithClaim(org.id)

    const review = await upsertClaimReview(org.id, user.id, {
      runId: run.id,
      claimId,
      humanVerdict: "unsupported",
      note: "disagree",
    })

    expect(review.agrees).toBe(false)
    expect(review.note).toBe("disagree")
  })

  it("re-reviewing the same claim updates the existing row instead of creating a duplicate", async () => {
    const org = await createTestOrg()
    const user = await createTestUser(org.id)
    const { run, claimId } = await setupRunWithClaim(org.id)

    const first = await upsertClaimReview(org.id, user.id, { runId: run.id, claimId, humanVerdict: "unsupported", note: "first" })
    const second = await upsertClaimReview(org.id, user.id, { runId: run.id, claimId, humanVerdict: "supported", note: "changed my mind" })

    expect(second.id).toBe(first.id)
    expect(second.humanVerdict).toBe("supported")
    expect(second.agrees).toBe(true)

    const reviews = await listClaimReviews(org.id, run.id)
    expect(reviews).toHaveLength(1)
    expect(reviews[0].note).toBe("changed my mind")
  })

  it("throws when the claim does not exist in the run", async () => {
    const org = await createTestOrg()
    const user = await createTestUser(org.id)
    const { run } = await setupRunWithClaim(org.id)

    await expect(
      upsertClaimReview(org.id, user.id, { runId: run.id, claimId: "not-a-real-claim-id", humanVerdict: "supported", note: null }),
    ).rejects.toThrow(/claim not found/i)
  })
})

describe("getCalibrationSummary", () => {
  it("computes overall agreement rate across multiple reviewed runs", async () => {
    const org = await createTestOrg()
    const user = await createTestUser(org.id)

    const a = await setupRunWithClaim(org.id, 95)
    const b = await setupRunWithClaim(org.id, 95)
    const c = await setupRunWithClaim(org.id, 40)

    await upsertClaimReview(org.id, user.id, { runId: a.run.id, claimId: a.claimId, humanVerdict: "supported", note: null }) // agrees
    await upsertClaimReview(org.id, user.id, { runId: b.run.id, claimId: b.claimId, humanVerdict: "hallucinated", note: null }) // disagrees
    await upsertClaimReview(org.id, user.id, { runId: c.run.id, claimId: c.claimId, humanVerdict: "supported", note: null }) // agrees

    const summary = await getCalibrationSummary(org.id)
    expect(summary.totalReviewed).toBe(3)
    expect(summary.overallAgreementRate).toBe(67) // 2/3 rounded

    const highConfBucket = summary.buckets.find((b) => b.label === "90-100%")!
    expect(highConfBucket.count).toBe(2)
    expect(highConfBucket.agreementRate).toBe(50) // 1 of 2 agreed at high confidence

    const lowConfBucket = summary.buckets.find((b) => b.label === "0-59%")!
    expect(lowConfBucket.count).toBe(1)
    expect(lowConfBucket.agreementRate).toBe(100)
  })
})
