import { describe, it, expect } from "vitest"
import { createTestOrg, createTestUser, makeEvaluationResult } from "@/lib/db/test-helpers"
import { insertRun, listRuns, deleteRun, listAuditLog, exportOrganizationData } from "@/lib/db/queries"
import { logAuditEvent } from "@/lib/audit/log"

describe("audit log", () => {
  it("lists events scoped to the organization, most recent first, with actor email joined", async () => {
    const orgA = await createTestOrg("Org A")
    const orgB = await createTestOrg("Org B")
    const userA = await createTestUser(orgA.id, "a@test.dev")

    await logAuditEvent({ organizationId: orgA.id, userId: userA.id, action: "login", ipAddress: "1.1.1.1" })
    await logAuditEvent({
      organizationId: orgA.id,
      userId: userA.id,
      action: "evaluation.create",
      resourceType: "evaluation_run",
      resourceId: "run-123",
      ipAddress: "1.1.1.1",
    })
    await logAuditEvent({ organizationId: orgB.id, action: "signup" })

    const eventsA = await listAuditLog(orgA.id)
    expect(eventsA).toHaveLength(2)
    expect(eventsA[0].action).toBe("evaluation.create")
    expect(eventsA[0].userEmail).toBe("a@test.dev")
    expect(eventsA[0].resourceId).toBe("run-123")

    const eventsB = await listAuditLog(orgB.id)
    expect(eventsB).toHaveLength(1)
    expect(eventsB[0].action).toBe("signup")
    expect(eventsB[0].userEmail).toBeNull()
  })
})

describe("deleteRun", () => {
  it("deletes a run belonging to the organization and reports success", async () => {
    const org = await createTestOrg()
    const run = await insertRun(org.id, {
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

    expect(await deleteRun(org.id, run.id)).toBe(true)
    expect(await listRuns(org.id)).toHaveLength(0)
  })

  it("refuses to delete a run belonging to a different organization", async () => {
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

    expect(await deleteRun(orgB.id, run.id)).toBe(false)
    expect(await listRuns(orgA.id)).toHaveLength(1)
  })

  it("returns false for a non-existent run id", async () => {
    const org = await createTestOrg()
    expect(await deleteRun(org.id, crypto.randomUUID())).toBe(false)
  })
})

describe("exportOrganizationData", () => {
  it("includes only the requesting organization's runs and excludes another org's data", async () => {
    const orgA = await createTestOrg("Org A")
    const orgB = await createTestOrg("Org B")

    const runA = await insertRun(orgA.id, {
      registeredModelId: null,
      model: "ModelA",
      domain: "Cardiology",
      spec: "spec",
      prompt: "prompt A",
      response: "response A",
      sources: null,
      durationMs: 1000,
      result: makeEvaluationResult(),
      retrievedEvidence: [],
    })
    await insertRun(orgB.id, {
      registeredModelId: null,
      model: "ModelB",
      domain: "Oncology",
      spec: "spec",
      prompt: "prompt B",
      response: "response B",
      sources: null,
      durationMs: 1000,
      result: makeEvaluationResult(),
      retrievedEvidence: [],
    })

    const exportA = await exportOrganizationData(orgA.id)

    expect(exportA.organization.id).toBe(orgA.id)
    expect(exportA.organization.name).toBe("Org A")
    expect(exportA.evaluationRuns).toHaveLength(1)
    expect(exportA.evaluationRuns[0].id).toBe(runA.id)
    expect(exportA.evaluationRuns.some((r) => r.model === "ModelB")).toBe(false)
  })
})
