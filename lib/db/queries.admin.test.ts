import { describe, it, expect } from "vitest"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { invites } from "@/lib/db/schema"
import { createTestOrg, createTestUser, makeEvaluationResult } from "@/lib/db/test-helpers"
import {
  insertRegisteredModel,
  updateRegisteredModel,
  deleteRegisteredModel,
  insertRun,
  listRuns,
  insertApiKey,
  listApiKeys,
  revokeApiKey,
  listOrgMembers,
  createInvite,
  listPendingInvites,
  getInviteByToken,
  revokeInvite,
  acceptInvite,
  markNotificationsSeen,
  getNotificationsSeenAt,
  countUnseenAuditEvents,
  setReviewerVerified,
} from "@/lib/db/queries"
import { logAuditEvent } from "@/lib/audit/log"
import { generateApiKey, authenticateApiKey } from "@/lib/auth/api-key"

const testMap = { domainSummary: "summary", stages: [{ name: "Triage", description: "d", expected: [] }] }

describe("updateRegisteredModel / deleteRegisteredModel", () => {
  it("updates only the given org's model and rejects cross-org access", async () => {
    const orgA = await createTestOrg("Org A")
    const orgB = await createTestOrg("Org B")
    const model = await insertRegisteredModel(orgA.id, { model: "M1", domain: "Cardiology", audience: "Expert", spec: "s", map: testMap })

    const crossOrgResult = await updateRegisteredModel(orgB.id, model.id, { model: "Hacked" })
    expect(crossOrgResult).toBeUndefined()

    const updated = await updateRegisteredModel(orgA.id, model.id, { model: "Renamed", domain: "Oncology" })
    expect(updated?.model).toBe("Renamed")
    expect(updated?.domain).toBe("Oncology")
  })

  it("deletes only within the owning org", async () => {
    const orgA = await createTestOrg("Org A")
    const orgB = await createTestOrg("Org B")
    const model = await insertRegisteredModel(orgA.id, { model: "M1", domain: "Cardiology", audience: "Expert", spec: "s", map: testMap })

    expect(await deleteRegisteredModel(orgB.id, model.id)).toBe(false)
    expect(await deleteRegisteredModel(orgA.id, model.id)).toBe(true)
  })
})

describe("listRuns search filtering", () => {
  it("filters by model, domain, and prompt substrings, scoped to the org", async () => {
    const org = await createTestOrg()
    await insertRun(org.id, {
      registeredModelId: null,
      model: "CardioScribe-3B",
      domain: "Clinical Cardiology",
      spec: "s",
      prompt: "Describe STEMI management",
      response: "r",
      sources: null,
      durationMs: 1,
      result: makeEvaluationResult(),
      retrievedEvidence: [],
    })
    await insertRun(org.id, {
      registeredModelId: null,
      model: "OncoAssist",
      domain: "Oncology",
      spec: "s",
      prompt: "Describe chemotherapy protocol",
      response: "r",
      sources: null,
      durationMs: 1,
      result: makeEvaluationResult(),
      retrievedEvidence: [],
    })

    expect(await listRuns(org.id, 20, "cardio")).toHaveLength(1)
    expect(await listRuns(org.id, 20, "STEMI")).toHaveLength(1)
    expect(await listRuns(org.id, 20, "nonexistent-substring")).toHaveLength(0)
    expect(await listRuns(org.id, 20)).toHaveLength(2)
  })
})

describe("API keys", () => {
  it("authenticates a freshly created key, then rejects it once revoked", async () => {
    const org = await createTestOrg()
    const { raw, hash, prefix } = generateApiKey()
    const key = await insertApiKey(org.id, { name: "CI", keyHash: hash, keyPrefix: prefix, createdByUserId: null })

    const req = new Request("http://localhost/api/evaluate", { headers: { authorization: `Bearer ${raw}` } })
    const auth = await authenticateApiKey(req)
    expect(auth).toEqual({ organizationId: org.id, apiKeyId: key.id })

    expect(await revokeApiKey(org.id, key.id)).toBe(true)
    expect(await authenticateApiKey(req)).toBeNull()
  })

  it("never exposes the key hash via listApiKeys", async () => {
    const org = await createTestOrg()
    const { hash, prefix } = generateApiKey()
    await insertApiKey(org.id, { name: "CI", keyHash: hash, keyPrefix: prefix, createdByUserId: null })

    const keys = await listApiKeys(org.id)
    expect(keys).toHaveLength(1)
    expect(keys[0]).not.toHaveProperty("keyHash")
  })

  it("scopes listApiKeys and revokeApiKey to the owning org", async () => {
    const orgA = await createTestOrg("Org A")
    const orgB = await createTestOrg("Org B")
    const { hash, prefix } = generateApiKey()
    const key = await insertApiKey(orgA.id, { name: "CI", keyHash: hash, keyPrefix: prefix, createdByUserId: null })

    expect(await listApiKeys(orgB.id)).toHaveLength(0)
    expect(await revokeApiKey(orgB.id, key.id)).toBe(false)
  })
})

describe("org members", () => {
  it("lists members scoped to the org, ordered by join date", async () => {
    const orgA = await createTestOrg("Org A")
    const orgB = await createTestOrg("Org B")
    await createTestUser(orgA.id, "owner@a.dev", "owner")
    await createTestUser(orgA.id, "member@a.dev", "member")
    await createTestUser(orgB.id, "owner@b.dev", "owner")

    const membersA = await listOrgMembers(orgA.id)
    expect(membersA).toHaveLength(2)
    expect(membersA.map((m) => m.email)).toEqual(["owner@a.dev", "member@a.dev"])
    expect(membersA[0]).not.toHaveProperty("passwordHash")
  })
})

describe("invites", () => {
  it("creates, lists, and accepts an invite into the inviting org", async () => {
    const org = await createTestOrg()
    const owner = await createTestUser(org.id, "owner@test.dev", "owner")

    const invite = await createInvite(org.id, { email: "newperson@test.dev", role: "member", invitedByUserId: owner.id })
    expect(await listPendingInvites(org.id)).toHaveLength(1)
    expect(await getInviteByToken(invite.token)).toBeDefined()

    const result = await acceptInvite(invite.token, { name: "New Person", passwordHash: "hash" })
    expect(result.organizationId).toBe(org.id)

    const members = await listOrgMembers(org.id)
    expect(members.some((m) => m.email === "newperson@test.dev" && m.role === "member")).toBe(true)
    expect(await listPendingInvites(org.id)).toHaveLength(0)
  })

  it("rejects accepting an already-accepted invite", async () => {
    const org = await createTestOrg()
    const owner = await createTestUser(org.id, "owner@test.dev", "owner")
    const invite = await createInvite(org.id, { email: "dupe@test.dev", role: "member", invitedByUserId: owner.id })

    await acceptInvite(invite.token, { name: "First", passwordHash: "hash" })
    await expect(acceptInvite(invite.token, { name: "Second", passwordHash: "hash" })).rejects.toThrow(/already accepted/i)
  })

  it("rejects accepting an invite for an email that already has an account", async () => {
    const org = await createTestOrg()
    const owner = await createTestUser(org.id, "owner@test.dev", "owner")
    await createTestUser(org.id, "existing@test.dev")
    const invite = await createInvite(org.id, { email: "existing@test.dev", role: "member", invitedByUserId: owner.id })

    await expect(acceptInvite(invite.token, { name: "Someone", passwordHash: "hash" })).rejects.toThrow(/already exists/i)
  })

  it("rejects accepting an expired invite", async () => {
    const org = await createTestOrg()
    const owner = await createTestUser(org.id, "owner@test.dev", "owner")
    const invite = await createInvite(org.id, { email: "late@test.dev", role: "member", invitedByUserId: owner.id })

    await db.update(invites).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(invites.id, invite.id))
    await expect(acceptInvite(invite.token, { name: "Late", passwordHash: "hash" })).rejects.toThrow(/expired/i)
  })

  it("scopes listPendingInvites and revokeInvite to the owning org", async () => {
    const orgA = await createTestOrg("Org A")
    const orgB = await createTestOrg("Org B")
    const ownerA = await createTestUser(orgA.id, "owner@a.dev", "owner")
    const invite = await createInvite(orgA.id, { email: "x@test.dev", role: "member", invitedByUserId: ownerA.id })

    expect(await listPendingInvites(orgB.id)).toHaveLength(0)
    expect(await revokeInvite(orgB.id, invite.id)).toBe(false)
    expect(await revokeInvite(orgA.id, invite.id)).toBe(true)
  })
})

describe("notifications", () => {
  it("counts events since the last-seen timestamp and counts everything when never seen", async () => {
    const org = await createTestOrg()
    const user = await createTestUser(org.id)

    expect(await getNotificationsSeenAt(user.id)).toBeNull()
    await logAuditEvent({ organizationId: org.id, userId: user.id, action: "login" })
    expect(await countUnseenAuditEvents(org.id, null)).toBe(1)

    const beforeSecondEvent = new Date()
    await markNotificationsSeen(user.id)
    const seenAt = await getNotificationsSeenAt(user.id)
    expect(seenAt).not.toBeNull()
    expect(seenAt!.getTime()).toBeGreaterThanOrEqual(beforeSecondEvent.getTime() - 1000)

    expect(await countUnseenAuditEvents(org.id, seenAt)).toBe(0)
    await logAuditEvent({ organizationId: org.id, userId: user.id, action: "signup" })
    expect(await countUnseenAuditEvents(org.id, seenAt)).toBe(1)
  })
})

describe("setReviewerVerified", () => {
  it("marks a member verified and reflects it in listOrgMembers, scoped to the owning org", async () => {
    const orgA = await createTestOrg("Org A")
    const orgB = await createTestOrg("Org B")
    const member = await createTestUser(orgA.id, "reviewer@a.dev")

    expect((await listOrgMembers(orgA.id)).find((m) => m.id === member.id)?.isVerifiedReviewer).toBe(false)

    expect(await setReviewerVerified(orgB.id, member.id, true)).toBe(false) // wrong org
    expect(await setReviewerVerified(orgA.id, member.id, true)).toBe(true)

    expect((await listOrgMembers(orgA.id)).find((m) => m.id === member.id)?.isVerifiedReviewer).toBe(true)

    expect(await setReviewerVerified(orgA.id, member.id, false)).toBe(true)
    expect((await listOrgMembers(orgA.id)).find((m) => m.id === member.id)?.isVerifiedReviewer).toBe(false)
  })
})
