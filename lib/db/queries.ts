import { and, cosineDistance, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  evaluationRuns,
  registeredModels,
  evidenceDocuments,
  evidenceChunks,
  llmCalls,
  claimReviews,
  type EvaluationRunRow,
  type RegisteredModelRow,
  type LlmCallRow,
  type ClaimReviewRow,
} from "@/lib/db/schema"
import type { EvaluationResult, DomainMap } from "@/lib/eval-schema"
import type { Claim, DomainStage, Improvement, RetrievedEvidenceChunk, ScoreMetric, RunSummary, Verdict } from "@/lib/data"
import { chunkText } from "@/lib/rag/chunk"
import { embedText, embedTexts } from "@/lib/rag/embed"

export interface NewRegisteredModelInput {
  model: string
  domain: string
  audience: string
  spec: string
  map: DomainMap
}

export async function insertRegisteredModel(
  organizationId: string,
  input: NewRegisteredModelInput,
): Promise<RegisteredModelRow> {
  const [row] = await db
    .insert(registeredModels)
    .values({
      organizationId,
      model: input.model,
      domain: input.domain,
      audience: input.audience,
      spec: input.spec,
      domainSummary: input.map.domainSummary,
      stages: input.map.stages,
    })
    .returning()

  return row
}

export async function listRegisteredModels(organizationId: string, limit = 50): Promise<RegisteredModelRow[]> {
  return db
    .select()
    .from(registeredModels)
    .where(eq(registeredModels.organizationId, organizationId))
    .orderBy(desc(registeredModels.createdAt))
    .limit(limit)
}

export async function getRegisteredModel(organizationId: string, id: string): Promise<RegisteredModelRow | undefined> {
  const [row] = await db
    .select()
    .from(registeredModels)
    .where(and(eq(registeredModels.id, id), eq(registeredModels.organizationId, organizationId)))
  return row
}

export async function ingestDocument(organizationId: string, domain: string, title: string, text: string) {
  const chunks = chunkText(text)
  if (chunks.length === 0) throw new Error("No content to ingest")
  const embeddings = await embedTexts(chunks, organizationId, "embed-ingest")

  return db.transaction(async (tx) => {
    const [doc] = await tx.insert(evidenceDocuments).values({ organizationId, domain, title }).returning()
    await tx.insert(evidenceChunks).values(
      chunks.map((content, i) => ({
        documentId: doc.id,
        organizationId,
        domain,
        chunkIndex: i,
        content,
        embedding: embeddings[i],
      })),
    )
    return { ...doc, chunkCount: chunks.length }
  })
}

export async function listEvidenceDocuments(organizationId: string, domain?: string) {
  const conditions = domain
    ? and(eq(evidenceDocuments.organizationId, organizationId), eq(evidenceDocuments.domain, domain))
    : eq(evidenceDocuments.organizationId, organizationId)

  return db
    .select({
      id: evidenceDocuments.id,
      title: evidenceDocuments.title,
      domain: evidenceDocuments.domain,
      createdAt: evidenceDocuments.createdAt,
      chunkCount: sql<number>`count(${evidenceChunks.id})::int`,
    })
    .from(evidenceDocuments)
    .leftJoin(evidenceChunks, eq(evidenceChunks.documentId, evidenceDocuments.id))
    .where(conditions)
    .groupBy(evidenceDocuments.id)
    .orderBy(desc(evidenceDocuments.createdAt))
}

export async function deleteEvidenceDocument(organizationId: string, id: string): Promise<void> {
  await db
    .delete(evidenceDocuments)
    .where(and(eq(evidenceDocuments.id, id), eq(evidenceDocuments.organizationId, organizationId)))
}

export async function retrieveEvidence(
  organizationId: string,
  domain: string,
  queryText: string,
  k = 8,
): Promise<RetrievedEvidenceChunk[]> {
  const queryEmbedding = await embedText(queryText, organizationId, "embed-retrieve")
  const distance = cosineDistance(evidenceChunks.embedding, queryEmbedding)

  const rows = await db
    .select({
      content: evidenceChunks.content,
      documentTitle: evidenceDocuments.title,
    })
    .from(evidenceChunks)
    .innerJoin(evidenceDocuments, eq(evidenceDocuments.id, evidenceChunks.documentId))
    .where(and(eq(evidenceChunks.organizationId, organizationId), eq(evidenceChunks.domain, domain)))
    .orderBy(distance)
    .limit(k)

  return rows.map((r, i) => ({ tag: `E${i + 1}`, documentTitle: r.documentTitle, content: r.content }))
}

export interface NewRunInput {
  registeredModelId: string | null
  model: string
  domain: string
  spec: string
  prompt: string
  response: string
  sources: string | null
  durationMs: number
  result: EvaluationResult
  retrievedEvidence: RetrievedEvidenceChunk[]
}

export async function insertRun(organizationId: string, input: NewRunInput): Promise<EvaluationRunRow> {
  const stages: DomainStage[] = (input.result.stages ?? []).map((s) => ({
    id: crypto.randomUUID(),
    name: s.name,
    description: s.note,
    coverage: Math.round(s.coverage),
    status: s.status,
    expected: [],
  }))

  const nameToStageId = new Map(stages.map((s) => [s.name.trim().toLowerCase(), s.id]))
  const validTags = new Set(input.retrievedEvidence.map((e) => e.tag))

  const claims: Claim[] = (input.result.claims ?? []).map((c) => {
    const citedTags = [...c.evidence.matchAll(/\[(E\d+)\]/g)].map((m) => m[1])
    return {
      id: crypto.randomUUID(),
      text: c.text,
      verdict: c.verdict,
      confidence: Math.round(c.confidence),
      stageId: nameToStageId.get(c.stage.trim().toLowerCase()) ?? crypto.randomUUID(),
      evidence: c.evidence,
      rationale: c.rationale,
      evidenceGrounded: citedTags.some((t) => validTags.has(t)),
    }
  })

  const improvements: Improvement[] = (input.result.improvements ?? []).map((i) => ({
    id: crypto.randomUUID(),
    severity: i.severity,
    category: i.category,
    title: i.title,
    detail: i.detail,
    recommendation: i.recommendation,
  }))

  const [row] = await db
    .insert(evaluationRuns)
    .values({
      organizationId,
      registeredModelId: input.registeredModelId,
      model: input.model,
      domain: input.domain,
      spec: input.spec,
      prompt: input.prompt,
      response: input.response,
      sources: input.sources,
      summary: input.result.summary,
      factuality: Math.round(input.result.factuality),
      specificity: Math.round(input.result.specificity),
      hallucinationRate: Math.round(input.result.hallucinationRate),
      confidence: Math.round(input.result.confidence),
      durationMs: input.durationMs,
      claims,
      stages,
      improvements,
      transcript: null,
      retrievedEvidence: input.retrievedEvidence.length ? input.retrievedEvidence : null,
    })
    .returning()

  return row
}

export async function listRuns(organizationId: string, limit = 20): Promise<EvaluationRunRow[]> {
  return db
    .select()
    .from(evaluationRuns)
    .where(eq(evaluationRuns.organizationId, organizationId))
    .orderBy(desc(evaluationRuns.createdAt))
    .limit(limit)
}

export async function getLatestRun(organizationId: string): Promise<EvaluationRunRow | undefined> {
  const [row] = await db
    .select()
    .from(evaluationRuns)
    .where(eq(evaluationRuns.organizationId, organizationId))
    .orderBy(desc(evaluationRuns.createdAt))
    .limit(1)
  return row
}

export async function getRun(organizationId: string, id: string): Promise<EvaluationRunRow | undefined> {
  const [row] = await db
    .select()
    .from(evaluationRuns)
    .where(and(eq(evaluationRuns.id, id), eq(evaluationRuns.organizationId, organizationId)))
  return row
}

export function toScoreMetrics(run: EvaluationRunRow, previous: EvaluationRunRow | undefined): ScoreMetric[] {
  const delta = (key: "factuality" | "specificity" | "hallucinationRate" | "confidence") =>
    previous ? run[key] - previous[key] : 0

  return [
    {
      key: "factuality",
      label: "Factuality",
      value: run.factuality,
      delta: delta("factuality"),
      caption: "Claims grounded in source evidence",
    },
    {
      key: "specificity",
      label: "Specificity",
      value: run.specificity,
      delta: delta("specificity"),
      caption: "Domain-appropriate depth & granularity",
    },
    {
      key: "hallucination",
      label: "Hallucination Rate",
      value: run.hallucinationRate,
      delta: delta("hallucinationRate"),
      caption: "Unsupported claims per response",
    },
    {
      key: "confidence",
      label: "Judge Confidence",
      value: run.confidence,
      delta: delta("confidence"),
      caption: "Judge's calibrated confidence in this verdict",
    },
  ]
}

export function toRunSummary(run: EvaluationRunRow): RunSummary {
  const claimCounts: RunSummary["claimCounts"] = {
    supported: 0,
    hallucinated: 0,
    unsupported: 0,
    "retrieval-gap": 0,
  }
  for (const c of run.claims) {
    claimCounts[c.verdict as Verdict] += 1
  }

  const stageCoverage: Record<string, number> = {}
  for (const s of run.stages) {
    stageCoverage[s.name] = s.coverage
  }

  return {
    id: run.id,
    version: run.model,
    date: run.createdAt.toISOString().slice(0, 10),
    factuality: run.factuality,
    specificity: run.specificity,
    hallucinationRate: run.hallucinationRate,
    agreement: run.confidence,
    claimCounts,
    stageCoverage,
  }
}

export async function listLlmCalls(organizationId: string, limit = 50): Promise<LlmCallRow[]> {
  return db
    .select()
    .from(llmCalls)
    .where(eq(llmCalls.organizationId, organizationId))
    .orderBy(desc(llmCalls.createdAt))
    .limit(limit)
}

export interface LlmUsageSummary {
  totalCalls: number
  successRate: number
  totalInputTokens: number
  totalOutputTokens: number
  totalEstimatedCostUsd: number
  avgLatencyMs: number
}

export async function getLlmUsageSummary(organizationId: string): Promise<LlmUsageSummary> {
  const [row] = await db
    .select({
      totalCalls: sql<number>`count(*)::int`,
      successCount: sql<number>`count(*) filter (where ${llmCalls.success})::int`,
      totalInputTokens: sql<number>`coalesce(sum(${llmCalls.inputTokens}), 0)::int`,
      totalOutputTokens: sql<number>`coalesce(sum(${llmCalls.outputTokens}), 0)::int`,
      totalEstimatedCostUsd: sql<number>`coalesce(sum(${llmCalls.estimatedCostUsd}), 0)::float`,
      avgLatencyMs: sql<number>`coalesce(avg(${llmCalls.latencyMs}), 0)::int`,
    })
    .from(llmCalls)
    .where(eq(llmCalls.organizationId, organizationId))

  return {
    totalCalls: row.totalCalls,
    successRate: row.totalCalls > 0 ? Math.round((row.successCount / row.totalCalls) * 100) : 100,
    totalInputTokens: row.totalInputTokens,
    totalOutputTokens: row.totalOutputTokens,
    totalEstimatedCostUsd: row.totalEstimatedCostUsd,
    avgLatencyMs: row.avgLatencyMs,
  }
}

export interface UpsertClaimReviewInput {
  runId: string
  claimId: string
  humanVerdict: Verdict
  note: string | null
}

export async function upsertClaimReview(
  organizationId: string,
  reviewerUserId: string,
  input: UpsertClaimReviewInput,
): Promise<ClaimReviewRow> {
  const run = await getRun(organizationId, input.runId)
  if (!run) throw new Error("Run not found")

  const claim = run.claims.find((c) => c.id === input.claimId)
  if (!claim) throw new Error("Claim not found in run")

  const agrees = claim.verdict === input.humanVerdict

  const [row] = await db
    .insert(claimReviews)
    .values({
      organizationId,
      runId: input.runId,
      claimId: input.claimId,
      reviewerUserId,
      judgeVerdict: claim.verdict,
      judgeConfidence: claim.confidence,
      humanVerdict: input.humanVerdict,
      agrees,
      note: input.note,
    })
    .onConflictDoUpdate({
      target: [claimReviews.runId, claimReviews.claimId],
      set: {
        reviewerUserId,
        judgeVerdict: claim.verdict,
        judgeConfidence: claim.confidence,
        humanVerdict: input.humanVerdict,
        agrees,
        note: input.note,
      },
    })
    .returning()

  return row
}

export async function listClaimReviews(organizationId: string, runId: string): Promise<ClaimReviewRow[]> {
  return db
    .select()
    .from(claimReviews)
    .where(and(eq(claimReviews.organizationId, organizationId), eq(claimReviews.runId, runId)))
}

export interface CalibrationBucket {
  label: string
  count: number
  agreementRate: number | null
}

export interface CalibrationSummary {
  totalReviewed: number
  overallAgreementRate: number | null
  buckets: CalibrationBucket[]
}

const CALIBRATION_BUCKETS = [
  { label: "0-59%", min: 0, max: 59 },
  { label: "60-79%", min: 60, max: 79 },
  { label: "80-89%", min: 80, max: 89 },
  { label: "90-100%", min: 90, max: 100 },
]

export function computeCalibrationBuckets(rows: { judgeConfidence: number; agrees: boolean }[]): CalibrationBucket[] {
  return CALIBRATION_BUCKETS.map((b) => {
    const inBucket = rows.filter((r) => r.judgeConfidence >= b.min && r.judgeConfidence <= b.max)
    const agreed = inBucket.filter((r) => r.agrees).length
    return {
      label: b.label,
      count: inBucket.length,
      agreementRate: inBucket.length > 0 ? Math.round((agreed / inBucket.length) * 100) : null,
    }
  })
}

export async function getCalibrationSummary(organizationId: string): Promise<CalibrationSummary> {
  const rows = await db
    .select({ judgeConfidence: claimReviews.judgeConfidence, agrees: claimReviews.agrees })
    .from(claimReviews)
    .where(eq(claimReviews.organizationId, organizationId))

  const buckets = computeCalibrationBuckets(rows)

  const totalReviewed = rows.length
  const totalAgreed = rows.filter((r) => r.agrees).length

  return {
    totalReviewed,
    overallAgreementRate: totalReviewed > 0 ? Math.round((totalAgreed / totalReviewed) * 100) : null,
    buckets,
  }
}

export async function getTotalJudgedClaimsCount(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(jsonb_array_length(${evaluationRuns.claims})), 0)::int` })
    .from(evaluationRuns)
    .where(eq(evaluationRuns.organizationId, organizationId))
  return row.total
}
