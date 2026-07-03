import { generateText, Output } from "ai"
import { domainMapSchema, type DomainMap } from "@/lib/eval-schema"
import { insertRegisteredModel } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { JUDGE_MODEL, JUDGE_FALLBACK_MODEL, JUDGE_TIMEOUT_MS, JUDGE_MAX_RETRIES, RATE_LIMIT_DERIVE_MAP_PER_HOUR } from "@/lib/ai/config"
import { logLlmCall } from "@/lib/ai/log"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { parseJsonBody } from "@/lib/api/parse-request"
import { deriveMapRequestSchema } from "@/lib/api/schemas"
import { checkOrgRateLimit, getClientIp } from "@/lib/api/rate-limit"
import { logAuditEvent } from "@/lib/audit/log"

export const maxDuration = 60

const MAX_BODY_BYTES = 300_000

const SYSTEM = `You are Adjudica's domain-mapping agent. A language-model vendor declares the domain their model specializes in, along with a specificity statement describing how deep and specialized its answers should be.

Your job: parse that declaration into an ordered "reasoning map" — the canonical sequence of reasoning stages an expert in this domain works through to produce a high-quality answer. For each stage, list 3-5 concrete expected reasoning steps or outputs that a strong, domain-appropriate answer MUST include at the declared depth.

This map becomes the rubric the judge later grades responses against, so make the stages mutually exclusive, collectively exhaustive, and specific to the domain (not generic). Produce 4-6 stages.`

async function deriveWithModel(model: string, userPrompt: string, organizationId: string): Promise<DomainMap> {
  const startedAt = Date.now()
  try {
    const result = await generateText({
      model,
      system: SYSTEM,
      prompt: userPrompt,
      output: Output.object({ schema: domainMapSchema }),
      maxRetries: JUDGE_MAX_RETRIES,
      timeout: JUDGE_TIMEOUT_MS,
    })
    await logLlmCall({
      organizationId,
      route: "derive-map",
      model,
      success: true,
      inputTokens: result.usage.inputTokens ?? null,
      outputTokens: result.usage.outputTokens ?? null,
      latencyMs: Date.now() - startedAt,
    })
    return result.output
  } catch (err) {
    await logLlmCall({
      organizationId,
      route: "derive-map",
      model,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startedAt,
    })
    throw err
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const { model, domain, audience, spec } = await parseJsonBody(req, deriveMapRequestSchema, MAX_BODY_BYTES)

    await checkOrgRateLimit(session.user.organizationId, "derive-map", {
      max: RATE_LIMIT_DERIVE_MAP_PER_HOUR,
      windowMs: 60 * 60 * 1000,
    })

    const userPrompt = `DOMAIN: ${domain}
TARGET AUDIENCE / DEPTH LEVEL: ${audience || "(unspecified)"}

VENDOR'S SPECIFICITY DECLARATION:
${spec}`

    let output: DomainMap
    try {
      output = await deriveWithModel(JUDGE_MODEL, userPrompt, session.user.organizationId)
    } catch (primaryErr) {
      if (!JUDGE_FALLBACK_MODEL) throw primaryErr
      output = await deriveWithModel(JUDGE_FALLBACK_MODEL, userPrompt, session.user.organizationId)
    }

    const row = await insertRegisteredModel(session.user.organizationId, {
      model: model || "Unnamed model",
      domain,
      audience: audience || "(unspecified)",
      spec,
      map: output,
    })

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "model.register",
      resourceType: "registered_model",
      resourceId: row.id,
      ipAddress: getClientIp(req),
    })

    return Response.json({ id: row.id, ...output })
  } catch (err) {
    if (err instanceof ApiError) return handleApiError(err)
    // Provider/model failures (e.g. a timeout AbortError) land here — never
    // let them escape uncaught.
    console.error("derive-map failed:", err)
    return Response.json({ error: "Could not derive the domain map." }, { status: 502 })
  }
}
