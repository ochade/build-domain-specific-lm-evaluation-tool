import { streamText, Output } from "ai"
import { evaluationResultSchema } from "@/lib/eval-schema"
import { insertRun, retrieveEvidence } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { JUDGE_MODEL, JUDGE_TIMEOUT_MS, JUDGE_MAX_RETRIES } from "@/lib/ai/config"
import { logLlmCall } from "@/lib/ai/log"

export const maxDuration = 60

const SYSTEM = `You are Adjudica-Judge, an agentic "agent-as-judge" evaluator for domain-specific language models.
You evaluate a model RESPONSE to a PROMPT in a stated DOMAIN, judging both FACTUALITY and SPECIFICITY.

You will be given an EVIDENCE CORPUS of retrieved reference chunks, each tagged with an id like [E1], [E2], etc. This is the ONLY authoritative evidence available — it was retrieved by a real similarity search against the vendor's ingested reference documents, not supplied by you.

Follow this rigorous, auditable procedure (do not skip steps):
1. DECOMPOSE the response into atomic, independently verifiable claims. Each claim should assert exactly one fact or recommendation.
2. For EACH claim, run an NLI-style entailment check against the EVIDENCE CORPUS chunks (and any "additional context" text, which is lower-trust and unverified). Decide the relationship: entailed, contradicted, or unsupported.
3. CLASSIFY each claim into exactly one verdict:
   - "supported": the claim is entailed by a specific [E#] chunk. You MUST cite that exact [E#] tag in the claim's evidence field.
   - "hallucinated": the claim directly contradicts a specific [E#] chunk. You MUST cite that exact [E#] tag in the claim's evidence field. This is the most severe error.
   - "unsupported": no [E#] chunk supports or contradicts it, and it is plausibly wrong, risky, or an over-generalization for the domain.
   - "retrieval-gap": the claim's topic is not covered by ANY retrieved [E#] chunk — an upstream retrieval failure (the right document likely wasn't ingested or indexed), NOT a fabrication. If the EVIDENCE CORPUS is empty or sparse, prefer this verdict (or "unsupported") over "supported" — do not invent support that isn't in a cited [E#] chunk.
   Never mark a claim "supported" or "hallucinated" without citing a real [E#] tag from the corpus you were given.
4. MAP each claim to a domain reasoning stage. Derive the stages from the declared domain specification (or infer a sensible reasoning structure for the domain). Compute per-stage coverage (0-100) and a status of strong/partial/weak.
5. SCORE the response: factuality (share of grounded claims, weighted by severity), specificity (domain-appropriate depth and granularity vs. the declared spec), hallucinationRate (% of claims that are hallucinated or unsupported), and your overall confidence.
6. DIAGNOSE: produce prioritized, root-cause-tagged improvements. Distinguish fine-tuning fixes from retrieval/index fixes. Be concrete.

Be precise and calibrated. Penalize confident fabrications heavily. Reward appropriate domain depth. Keep evidence and rationale concise, and always include the [E#] tag inline in the evidence field when one applies.`

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { model, prompt, response, domain, spec, sources, registeredModelId } = await req.json()
  const startedAt = Date.now()

  const retrievedEvidence = domain ? await retrieveEvidence(session.user.organizationId, domain, response, 8) : []

  const evidenceBlock = retrievedEvidence.length
    ? retrievedEvidence.map((e) => `[${e.tag}] (from "${e.documentTitle}")\n${e.content}`).join("\n\n")
    : "(No reference documents have been ingested for this domain yet — no [E#] evidence is available. Do not fabricate support; prefer 'retrieval-gap' or 'unsupported'.)"

  const userContent = `DOMAIN: ${domain || "(unspecified)"}

DECLARED DOMAIN SPECIFICATION / EXPECTED REASONING:
${spec || "(none provided — infer a reasonable reasoning structure for the domain)"}

EVIDENCE CORPUS (retrieved, authoritative):
${evidenceBlock}

${sources ? `ADDITIONAL CONTEXT (pasted by the user, NOT independently verified, lower trust than [E#] evidence):\n${sources}\n` : ""}
PROMPT GIVEN TO THE MODEL:
${prompt}

MODEL RESPONSE TO EVALUATE:
${response}`

  const result = streamText({
    model: JUDGE_MODEL,
    system: SYSTEM,
    prompt: userContent,
    output: Output.object({ schema: evaluationResultSchema }),
    maxRetries: JUDGE_MAX_RETRIES,
    timeout: JUDGE_TIMEOUT_MS,
  })

  void (async () => {
    try {
      const [evalResult, usage] = await Promise.all([result.output, result.usage])
      const latencyMs = Date.now() - startedAt
      await logLlmCall({
        organizationId: session.user.organizationId,
        route: "evaluate",
        model: JUDGE_MODEL,
        success: true,
        inputTokens: usage.inputTokens ?? null,
        outputTokens: usage.outputTokens ?? null,
        latencyMs,
      })
      await insertRun(session.user.organizationId, {
        registeredModelId: registeredModelId || null,
        model: model || "Unnamed model",
        domain: domain || "(unspecified)",
        spec: spec || "",
        prompt,
        response,
        sources: sources || null,
        durationMs: latencyMs,
        result: evalResult,
        retrievedEvidence,
      })
    } catch (err) {
      await logLlmCall({
        organizationId: session.user.organizationId,
        route: "evaluate",
        model: JUDGE_MODEL,
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - startedAt,
      })
      console.error("Failed to persist evaluation run:", err)
    }
  })()

  return result.toTextStreamResponse()
}
