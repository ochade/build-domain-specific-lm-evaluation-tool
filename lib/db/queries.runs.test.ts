import { describe, it, expect } from "vitest"
import { createTestOrg, makeEvaluationResult } from "@/lib/db/test-helpers"
import { insertRun, getRun, listRuns, getLatestRun } from "@/lib/db/queries"

describe("insertRun / getRun / listRuns round trip", () => {
  it("persists a run and reads it back with matching fields", async () => {
    const org = await createTestOrg()
    const result = makeEvaluationResult({ factuality: 55, hallucinationRate: 40 })

    const inserted = await insertRun(org.id, {
      registeredModelId: null,
      model: "CardioScribe-3B",
      domain: "Clinical Cardiology",
      spec: "spec",
      prompt: "prompt",
      response: "response",
      sources: null,
      durationMs: 12345,
      result,
      retrievedEvidence: [{ tag: "E1", documentTitle: "Doc", content: "supporting text" }],
    })

    const fetched = await getRun(org.id, inserted.id)
    expect(fetched).toBeDefined()
    expect(fetched!.model).toBe("CardioScribe-3B")
    expect(fetched!.factuality).toBe(55)
    expect(fetched!.hallucinationRate).toBe(40)
    expect(fetched!.durationMs).toBe(12345)
    expect(fetched!.claims).toHaveLength(1)
  })

  it("marks a claim evidenceGrounded when it cites a retrieved [E#] tag, false otherwise", async () => {
    const org = await createTestOrg()
    const result = makeEvaluationResult({
      claims: [
        { text: "Grounded claim", verdict: "supported", confidence: 90, stage: "Triage", evidence: "[E1] cite", rationale: "r" },
        { text: "Ungrounded claim", verdict: "unsupported", confidence: 50, stage: "Triage", evidence: "no citation here", rationale: "r" },
      ],
    })

    const run = await insertRun(org.id, {
      registeredModelId: null,
      model: "TestModel",
      domain: "Cardiology",
      spec: "spec",
      prompt: "prompt",
      response: "response",
      sources: null,
      durationMs: 1000,
      result,
      retrievedEvidence: [{ tag: "E1", documentTitle: "Doc", content: "text" }],
    })

    expect(run.claims.find((c) => c.text === "Grounded claim")?.evidenceGrounded).toBe(true)
    expect(run.claims.find((c) => c.text === "Ungrounded claim")?.evidenceGrounded).toBe(false)
  })

  it("does not mark a claim grounded if it cites a tag that was never actually retrieved", async () => {
    const org = await createTestOrg()
    const result = makeEvaluationResult({
      claims: [{ text: "Fake citation", verdict: "supported", confidence: 90, stage: "Triage", evidence: "[E5] made up", rationale: "r" }],
    })

    const run = await insertRun(org.id, {
      registeredModelId: null,
      model: "TestModel",
      domain: "Cardiology",
      spec: "spec",
      prompt: "prompt",
      response: "response",
      sources: null,
      durationMs: 1000,
      result,
      retrievedEvidence: [{ tag: "E1", documentTitle: "Doc", content: "text" }], // only E1 was really retrieved
    })

    expect(run.claims[0].evidenceGrounded).toBe(false)
  })

  it("listRuns orders newest first and getLatestRun returns the most recent", async () => {
    const org = await createTestOrg()
    const older = await insertRun(org.id, {
      registeredModelId: null,
      model: "v1",
      domain: "Cardiology",
      spec: "spec",
      prompt: "p",
      response: "r",
      sources: null,
      durationMs: 1,
      result: makeEvaluationResult(),
      retrievedEvidence: [],
    })
    await new Promise((resolve) => setTimeout(resolve, 5))
    const newer = await insertRun(org.id, {
      registeredModelId: null,
      model: "v2",
      domain: "Cardiology",
      spec: "spec",
      prompt: "p",
      response: "r",
      sources: null,
      durationMs: 1,
      result: makeEvaluationResult(),
      retrievedEvidence: [],
    })

    const runs = await listRuns(org.id)
    expect(runs.map((r) => r.id)).toEqual([newer.id, older.id])

    const latest = await getLatestRun(org.id)
    expect(latest?.id).toBe(newer.id)
  })
})
