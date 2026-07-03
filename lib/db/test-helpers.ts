import { db } from "@/lib/db"
import { organizations, users } from "@/lib/db/schema"
import type { EvaluationResult } from "@/lib/eval-schema"

export async function createTestOrg(name = "Test Org") {
  const [org] = await db.insert(organizations).values({ name }).returning()
  return org
}

export async function createTestUser(
  organizationId: string,
  email = `user-${crypto.randomUUID()}@test.dev`,
  role: "owner" | "member" = "member",
) {
  const [user] = await db
    .insert(users)
    .values({
      organizationId,
      email,
      name: "Test User",
      passwordHash: "not-a-real-hash",
      role,
    })
    .returning()
  return user
}

export function makeEvaluationResult(overrides: Partial<EvaluationResult> = {}): EvaluationResult {
  return {
    summary: "A test summary.",
    factuality: 80,
    specificity: 70,
    hallucinationRate: 10,
    confidence: 90,
    claims: [
      {
        text: "A claim citing evidence.",
        verdict: "supported",
        confidence: 90,
        stage: "Triage",
        evidence: "[E1] supporting text",
        rationale: "because",
      },
    ],
    stages: [{ name: "Triage", coverage: 90, status: "strong", note: "good" }],
    improvements: [],
    ...overrides,
  }
}
