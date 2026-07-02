import { pgTable, uuid, text, integer, jsonb, timestamp, vector, boolean, real, unique } from "drizzle-orm/pg-core"
import type { Claim, DomainStage, Improvement, RetrievedEvidenceChunk, TranscriptSegment } from "@/lib/data"
import type { DomainMap } from "@/lib/eval-schema"

export const EMBEDDING_DIMENSIONS = 1536

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  name: text("name").notNull(),
})

export type OrganizationRow = typeof organizations.$inferSelect

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
})

export type UserRow = typeof users.$inferSelect

export const registeredModels = pgTable("registered_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  model: text("model").notNull(),
  domain: text("domain").notNull(),
  audience: text("audience").notNull(),
  spec: text("spec").notNull(),
  domainSummary: text("domain_summary").notNull(),
  stages: jsonb("stages").$type<DomainMap["stages"]>().notNull(),
})

export type RegisteredModelRow = typeof registeredModels.$inferSelect
export type NewRegisteredModelRow = typeof registeredModels.$inferInsert

export const evidenceDocuments = pgTable("evidence_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  title: text("title").notNull(),
})

export type EvidenceDocumentRow = typeof evidenceDocuments.$inferSelect

export const evidenceChunks = pgTable("evidence_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  documentId: uuid("document_id")
    .notNull()
    .references(() => evidenceDocuments.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
})

export type EvidenceChunkRow = typeof evidenceChunks.$inferSelect

export const evaluationRuns = pgTable("evaluation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  registeredModelId: uuid("registered_model_id").references(() => registeredModels.id, { onDelete: "set null" }),

  model: text("model").notNull(),
  domain: text("domain").notNull(),
  spec: text("spec").notNull(),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  sources: text("sources"),

  summary: text("summary").notNull(),
  factuality: integer("factuality").notNull(),
  specificity: integer("specificity").notNull(),
  hallucinationRate: integer("hallucination_rate").notNull(),
  confidence: integer("confidence").notNull(),
  durationMs: integer("duration_ms").notNull(),

  claims: jsonb("claims").$type<Claim[]>().notNull(),
  stages: jsonb("stages").$type<DomainStage[]>().notNull(),
  improvements: jsonb("improvements").$type<Improvement[]>().notNull(),
  transcript: jsonb("transcript").$type<TranscriptSegment[] | null>(),
  retrievedEvidence: jsonb("retrieved_evidence").$type<RetrievedEvidenceChunk[] | null>(),
})

export type EvaluationRunRow = typeof evaluationRuns.$inferSelect
export type NewEvaluationRunRow = typeof evaluationRuns.$inferInsert

export const llmCalls = pgTable("llm_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  route: text("route").notNull(), // "derive-map" | "evaluate" | "embed-ingest" | "embed-retrieve"
  model: text("model").notNull(),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  estimatedCostUsd: real("estimated_cost_usd"),
  latencyMs: integer("latency_ms").notNull(),
})

export type LlmCallRow = typeof llmCalls.$inferSelect

export const claimReviews = pgTable(
  "claim_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => evaluationRuns.id, { onDelete: "cascade" }),
    claimId: text("claim_id").notNull(),
    reviewerUserId: uuid("reviewer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    judgeVerdict: text("judge_verdict").notNull(),
    judgeConfidence: integer("judge_confidence").notNull(),
    humanVerdict: text("human_verdict").notNull(),
    agrees: boolean("agrees").notNull(),
    note: text("note"),
  },
  (table) => [unique().on(table.runId, table.claimId)],
)

export type ClaimReviewRow = typeof claimReviews.$inferSelect
