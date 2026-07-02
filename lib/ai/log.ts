import { db } from "@/lib/db"
import { llmCalls } from "@/lib/db/schema"
import { estimateCostUsd } from "@/lib/ai/config"

export interface LogLlmCallInput {
  organizationId: string | null
  route: "derive-map" | "evaluate" | "embed-ingest" | "embed-retrieve"
  model: string
  success: boolean
  errorMessage?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  latencyMs: number
}

export async function logLlmCall(input: LogLlmCallInput): Promise<void> {
  try {
    const inputTokens = input.inputTokens ?? null
    const outputTokens = input.outputTokens ?? null
    await db.insert(llmCalls).values({
      organizationId: input.organizationId,
      route: input.route,
      model: input.model,
      success: input.success,
      errorMessage: input.errorMessage ?? null,
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateCostUsd(input.model, inputTokens, outputTokens),
      latencyMs: Math.round(input.latencyMs),
    })
  } catch (err) {
    // Observability must never break the actual feature.
    console.error("Failed to log LLM call:", err)
  }
}
