import { config } from "dotenv"
import { beforeEach } from "vitest"

config({ path: ".env.test" })

if (!process.env.DATABASE_URL?.includes("_test")) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL does not look like a test database (expected a name containing '_test'). " +
      "Check .env.test — tests truncate all tables before each test.",
  )
}

beforeEach(async () => {
  const { db } = await import("@/lib/db")
  const { sql } = await import("drizzle-orm")
  await db.execute(sql`
    TRUNCATE TABLE
      claim_reviews,
      llm_calls,
      evidence_chunks,
      evidence_documents,
      evaluation_runs,
      registered_models,
      users,
      organizations
    RESTART IDENTITY CASCADE
  `)
})
