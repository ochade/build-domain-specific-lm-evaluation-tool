import { embed, embedMany } from "ai"
import { EMBEDDING_MODEL } from "@/lib/ai/config"
import { logLlmCall } from "@/lib/ai/log"

export async function embedText(
  text: string,
  organizationId: string,
  route: "embed-ingest" | "embed-retrieve",
): Promise<number[]> {
  const startedAt = Date.now()
  try {
    const { embedding, usage } = await embed({ model: EMBEDDING_MODEL, value: text })
    await logLlmCall({
      organizationId,
      route,
      model: EMBEDDING_MODEL,
      success: true,
      inputTokens: usage?.tokens ?? null,
      outputTokens: null,
      latencyMs: Date.now() - startedAt,
    })
    return embedding
  } catch (err) {
    await logLlmCall({
      organizationId,
      route,
      model: EMBEDDING_MODEL,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startedAt,
    })
    throw err
  }
}

export async function embedTexts(
  texts: string[],
  organizationId: string,
  route: "embed-ingest" | "embed-retrieve",
): Promise<number[][]> {
  const startedAt = Date.now()
  try {
    const { embeddings, usage } = await embedMany({ model: EMBEDDING_MODEL, values: texts })
    await logLlmCall({
      organizationId,
      route,
      model: EMBEDDING_MODEL,
      success: true,
      inputTokens: usage?.tokens ?? null,
      outputTokens: null,
      latencyMs: Date.now() - startedAt,
    })
    return embeddings
  } catch (err) {
    await logLlmCall({
      organizationId,
      route,
      model: EMBEDDING_MODEL,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startedAt,
    })
    throw err
  }
}
