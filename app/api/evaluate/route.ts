import { streamText, Output } from "ai"
import { evaluationResultSchema } from "@/lib/eval-schema"

export const maxDuration = 60

const SYSTEM = `You are Adjudica-Judge, an agentic "agent-as-judge" evaluator for domain-specific language models.
You evaluate a model RESPONSE to a PROMPT in a stated DOMAIN, judging both FACTUALITY and SPECIFICITY.

Follow this rigorous, auditable procedure (do not skip steps):
1. DECOMPOSE the response into atomic, independently verifiable claims. Each claim should assert exactly one fact or recommendation.
2. For EACH claim, run an NLI-style entailment check against the best available domain evidence (the provided sources if given, otherwise authoritative domain knowledge). Decide the relationship: entailed, contradicted, or unsupported.
3. CLASSIFY each claim into exactly one verdict:
   - "supported": the claim is entailed by evidence.
   - "hallucinated": the claim directly contradicts authoritative evidence. This is the most severe error.
   - "unsupported": no evidence supports it and it is plausibly wrong, risky, or an over-generalization for the domain.
   - "retrieval-gap": the claim is off-target because the correct information was likely never retrieved/surfaced — an upstream retrieval failure, NOT a fabrication. Use this to separate retrieval problems from true hallucinations.
4. MAP each claim to a domain reasoning stage. Derive the stages from the declared domain specification (or infer a sensible reasoning structure for the domain). Compute per-stage coverage (0-100) and a status of strong/partial/weak.
5. SCORE the response: factuality (share of grounded claims, weighted by severity), specificity (domain-appropriate depth and granularity vs. the declared spec), hallucinationRate (% of claims that are hallucinated or unsupported), and your overall confidence.
6. DIAGNOSE: produce prioritized, root-cause-tagged improvements. Distinguish fine-tuning fixes from retrieval/index fixes. Be concrete.

Be precise and calibrated. Penalize confident fabrications heavily. Reward appropriate domain depth. Keep evidence and rationale concise.`

export async function POST(req: Request) {
  const { prompt, response, domain, spec, sources } = await req.json()

  const userContent = `DOMAIN: ${domain || "(unspecified)"}

DECLARED DOMAIN SPECIFICATION / EXPECTED REASONING:
${spec || "(none provided — infer a reasonable reasoning structure for the domain)"}

${sources ? `REFERENCE SOURCES / EVIDENCE CORPUS:\n${sources}\n` : ""}
PROMPT GIVEN TO THE MODEL:
${prompt}

MODEL RESPONSE TO EVALUATE:
${response}`

  const result = streamText({
    model: "openai/gpt-5-mini",
    system: SYSTEM,
    prompt: userContent,
    output: Output.object({ schema: evaluationResultSchema }),
  })

  return result.toTextStreamResponse()
}
