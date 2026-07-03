import { streamText, generateObject, Output, type LanguageModelUsage } from "ai"
import {
  decomposeResultSchema,
  verifyResultSchema,
  computeDeterministicScores,
  type EvaluationResult,
  type VerifyResult,
} from "@/lib/eval-schema"
import { insertRun, retrieveEvidence } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { authenticateApiKey } from "@/lib/auth/api-key"
import {
  JUDGE_MODEL,
  JUDGE_DECOMPOSE_MODEL,
  JUDGE_TIMEOUT_MS,
  JUDGE_DECOMPOSE_TIMEOUT_MS,
  JUDGE_MAX_RETRIES,
  RATE_LIMIT_EVALUATE_PER_HOUR,
} from "@/lib/ai/config"
import { logLlmCall } from "@/lib/ai/log"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { parseJsonBody } from "@/lib/api/parse-request"
import { evaluateRequestSchema } from "@/lib/api/schemas"
import { checkOrgRateLimit, getClientIp } from "@/lib/api/rate-limit"
import { logAuditEvent } from "@/lib/audit/log"
import type { RetrievedEvidenceChunk } from "@/lib/data"
import type { EvaluationRunRow } from "@/lib/db/schema"

export const maxDuration = 120

const MAX_BODY_BYTES = 300_000
const EVIDENCE_PER_CLAIM = 4

const DECOMPOSE_SYSTEM = `You are the decomposition stage of Adjudica-Judge, an agent-as-judge evaluator for domain-specific language models. Your ONLY job is structural: break the model's RESPONSE into atomic, independently verifiable claims, and map each claim to a domain reasoning stage.

Do NOT judge whether any claim is true, false, or supported — that happens in a later verification stage. Do NOT invent facts or evidence. Do NOT score anything.

For each claim:
- Extract it as a single, independently checkable assertion (one fact or recommendation per claim — split compound sentences so each independently verifiable part is its own claim).
- Assign a short stable id ("c1", "c2", ...) in the order the claims appear.
- Assign it to a domain reasoning stage, derived from the declared domain specification (or a sensible inferred structure for the domain if none is given clearly).

Produce a complete list of claims covering everything checkable in the response — do not skip claims because they seem obviously true or false; that judgment belongs to the next stage.`

const VERIFY_SYSTEM = `You are the verification stage of Adjudica-Judge, an agent-as-judge evaluator for domain-specific language models. You are given a list of already-decomposed CLAIMS from a model's response, each paired with its OWN retrieved evidence (tagged like [E1], [E2] — evidence is scoped per-claim, not shared across claims). This evidence was retrieved by a real similarity search against the vendor's ingested reference documents for each specific claim, not supplied by you.

For EACH claim, given ONLY the evidence provided for that specific claim (and any "additional context" text, which is lower-trust and unverified):
1. Run an NLI-style entailment check: does the evidence entail, contradict, or say nothing about the claim?
2. Classify into exactly one verdict:
   - "supported": entailed by a specific [E#] chunk shown for this claim. You MUST cite that exact [E#] tag in the evidence field.
   - "hallucinated": directly contradicts a specific [E#] chunk shown for this claim. You MUST cite that exact [E#] tag. This is the most severe error.
   - "unsupported": no [E#] chunk shown for this claim supports or contradicts it, and it is plausibly wrong, risky, or an over-generalization for the domain.
   - "retrieval-gap": no evidence was retrieved for this claim at all, or the retrieved evidence doesn't cover its topic — an upstream retrieval failure, not a fabrication. Prefer this (or "unsupported") over "supported" when evidence for the claim is empty or sparse — never invent support that isn't in a cited [E#] chunk actually shown to you for that claim.
   Never mark a claim "supported" or "hallucinated" without citing a real [E#] tag that was actually shown for THAT claim.
3. Echo the claim's original "id", "text", and "stage" back EXACTLY as given — do not reword, merge, or split claims.

Across all claims, also:
4. Compute per-stage coverage (0-100) and a status of strong/partial/weak for each distinct domain reasoning stage that appears among the claims.
5. Assess specificity: domain-appropriate depth and granularity of the response vs. the declared domain specification, 0-100.
6. Diagnose: produce prioritized, root-cause-tagged improvements. Distinguish fine-tuning fixes (the model itself) from retrieval/index fixes (missing or poorly indexed reference documents). Be concrete.

Be precise and calibrated. Penalize confident fabrications heavily. Reward appropriate domain depth. Keep evidence and rationale concise, and always include the [E#] tag inline in the evidence field when one applies.`

interface PersistEvaluationInput {
  organizationId: string
  userId: string | null
  req: Request
  registeredModelId: string | null
  model: string | undefined
  domain: string
  spec: string | undefined
  prompt: string
  response: string
  sources: string | undefined
  retrievedEvidence: RetrievedEvidenceChunk[]
  evalResult: EvaluationResult
  usage: LanguageModelUsage
  startedAt: number
}

async function persistEvaluation(input: PersistEvaluationInput): Promise<EvaluationRunRow> {
  const latencyMs = Date.now() - input.startedAt
  await logLlmCall({
    organizationId: input.organizationId,
    route: "evaluate",
    model: JUDGE_MODEL,
    success: true,
    inputTokens: input.usage.inputTokens ?? null,
    outputTokens: input.usage.outputTokens ?? null,
    latencyMs,
  })
  const run = await insertRun(input.organizationId, {
    registeredModelId: input.registeredModelId,
    model: input.model || "Unnamed model",
    domain: input.domain,
    spec: input.spec || "",
    prompt: input.prompt,
    response: input.response,
    sources: input.sources || null,
    durationMs: latencyMs,
    result: input.evalResult,
    retrievedEvidence: input.retrievedEvidence,
  })
  await logAuditEvent({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "evaluation.create",
    resourceType: "evaluation_run",
    resourceId: run.id,
    ipAddress: getClientIp(input.req),
  })
  return run
}

async function logEvaluationFailure(organizationId: string, model: string, startedAt: number, err: unknown) {
  await logLlmCall({
    organizationId,
    route: "evaluate",
    model,
    success: false,
    errorMessage: err instanceof Error ? err.message : String(err),
    latencyMs: Date.now() - startedAt,
  })
  console.error("Failed to evaluate:", err)
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    const apiKeyAuth = session ? null : await authenticateApiKey(req)
    if (!session && !apiKeyAuth) throw new ApiError(401, "Unauthorized")

    const organizationId = session ? session.user.organizationId : apiKeyAuth!.organizationId
    const userId = session ? session.user.id : null

    const body = await parseJsonBody(req, evaluateRequestSchema, MAX_BODY_BYTES)
    const { model, prompt, response, domain, spec, sources, registeredModelId } = body
    const startedAt = Date.now()

    await checkOrgRateLimit(organizationId, "evaluate", {
      max: RATE_LIMIT_EVALUATE_PER_HOUR,
      windowMs: 60 * 60 * 1000,
    })

    // --- Step 1: DECOMPOSE — split the response into atomic claims. Not
    // shown to the client; this is a fast structural pass, not a judgment. ---
    const decomposeModel = JUDGE_DECOMPOSE_MODEL || JUDGE_MODEL
    const decomposeStartedAt = Date.now()
    let claims: { id: string; text: string; stage: string }[]
    try {
      const decomposed = await generateObject({
        model: decomposeModel,
        system: DECOMPOSE_SYSTEM,
        prompt: `DOMAIN: ${domain}\n\nDECLARED DOMAIN SPECIFICATION:\n${spec || "(none provided — infer a reasonable reasoning structure for the domain)"}\n\nMODEL RESPONSE TO DECOMPOSE:\n${response}`,
        schema: decomposeResultSchema,
        maxRetries: JUDGE_MAX_RETRIES,
        timeout: JUDGE_DECOMPOSE_TIMEOUT_MS,
      })
      claims = decomposed.object.claims
      await logLlmCall({
        organizationId,
        route: "evaluate",
        model: decomposeModel,
        success: true,
        inputTokens: decomposed.usage.inputTokens ?? null,
        outputTokens: decomposed.usage.outputTokens ?? null,
        latencyMs: Date.now() - decomposeStartedAt,
      })
    } catch (err) {
      await logEvaluationFailure(organizationId, decomposeModel, decomposeStartedAt, err)
      throw new ApiError(502, "The judge encountered an error while decomposing the response.")
    }

    // --- Step 2: RETRIEVE — evidence per-claim, in parallel, with globally
    // unique [E#] tags across the whole run. A single claim's retrieval
    // failing (e.g. an embedding-provider rate limit — this now makes one
    // embedding call per claim instead of one for the whole response)
    // degrades to "no evidence for this claim" rather than failing the
    // whole evaluation.
    const evidenceSettled = await Promise.allSettled(
      claims.map((c, i) => retrieveEvidence(organizationId, domain, c.text, EVIDENCE_PER_CLAIM, i * EVIDENCE_PER_CLAIM)),
    )
    const evidencePerClaim = evidenceSettled.map((settled, i) => {
      if (settled.status === "fulfilled") return settled.value
      console.error(`Evidence retrieval failed for claim ${claims[i].id}:`, settled.reason)
      return []
    })
    const evidenceByClaimId = new Map(claims.map((c, i) => [c.id, evidencePerClaim[i]]))
    const retrievedEvidence = evidencePerClaim.flat()

    const claimsBlock = claims
      .map((c) => {
        const evidence = evidenceByClaimId.get(c.id) ?? []
        const evidenceText = evidence.length
          ? evidence.map((e) => `[${e.tag}] (from "${e.documentTitle}")\n${e.content}`).join("\n\n")
          : "(No evidence was retrieved for this claim — no [E#] tags are available for it. Prefer 'retrieval-gap' or 'unsupported' rather than inventing support.)"
        return `CLAIM ${c.id} (stage: ${c.stage}):\n"${c.text}"\n\nEVIDENCE FOR THIS CLAIM:\n${evidenceText}`
      })
      .join("\n\n---\n\n")

    const verifyUserContent = `DOMAIN: ${domain}

DECLARED DOMAIN SPECIFICATION / EXPECTED REASONING:
${spec || "(none provided — infer a reasonable reasoning structure for the domain)"}

${sources ? `ADDITIONAL CONTEXT (pasted by the user, NOT independently verified, lower trust than [E#] evidence):\n${sources}\n` : ""}
PROMPT GIVEN TO THE MODEL:
${prompt}

MODEL RESPONSE BEING EVALUATED (already decomposed into the claims below — do not re-decompose it):
${response}

CLAIMS TO VERIFY (echo each claim's id/text/stage back exactly as given, do not alter them):
${claimsBlock}`

    // --- Step 3: VERIFY + DIAGNOSE — the only step streamed to the client. ---
    const result = streamText({
      model: JUDGE_MODEL,
      system: VERIFY_SYSTEM,
      prompt: verifyUserContent,
      output: Output.object({ schema: verifyResultSchema }),
      maxRetries: JUDGE_MAX_RETRIES,
      timeout: JUDGE_TIMEOUT_MS,
    })

    function assembleFinalResult(verifyResult: VerifyResult): EvaluationResult {
      const scores = computeDeterministicScores(verifyResult.claims)
      return { ...verifyResult, ...scores }
    }

    // API-key (CI) callers get a synchronous JSON response with a definite
    // runId — there's no streaming client on the other end to consume a
    // text stream, and CI needs something to poll-free assert against.
    if (apiKeyAuth) {
      try {
        const [verifyResult, usage] = await Promise.all([result.output, result.usage])
        const evalResult = assembleFinalResult(verifyResult)
        const run = await persistEvaluation({
          organizationId,
          userId,
          req,
          registeredModelId: registeredModelId || null,
          model,
          domain,
          spec,
          prompt,
          response,
          sources,
          retrievedEvidence,
          evalResult,
          usage,
          startedAt,
        })
        return Response.json({ runId: run.id, ...evalResult })
      } catch (err) {
        await logEvaluationFailure(organizationId, JUDGE_MODEL, startedAt, err)
        throw new ApiError(502, "The judge encountered an error while evaluating.")
      }
    }

    void (async () => {
      try {
        const [verifyResult, usage] = await Promise.all([result.output, result.usage])
        const evalResult = assembleFinalResult(verifyResult)
        await persistEvaluation({
          organizationId,
          userId,
          req,
          registeredModelId: registeredModelId || null,
          model,
          domain,
          spec,
          prompt,
          response,
          sources,
          retrievedEvidence,
          evalResult,
          usage,
          startedAt,
        })
      } catch (err) {
        await logEvaluationFailure(organizationId, JUDGE_MODEL, startedAt, err)
      }
    })()

    return result.toTextStreamResponse()
  } catch (err) {
    return handleApiError(err)
  }
}
