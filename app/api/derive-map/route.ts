import { generateText, Output } from "ai"
import { domainMapSchema } from "@/lib/eval-schema"

export const maxDuration = 60

const SYSTEM = `You are Adjudica's domain-mapping agent. A language-model vendor declares the domain their model specializes in, along with a specificity statement describing how deep and specialized its answers should be.

Your job: parse that declaration into an ordered "reasoning map" — the canonical sequence of reasoning stages an expert in this domain works through to produce a high-quality answer. For each stage, list 3-5 concrete expected reasoning steps or outputs that a strong, domain-appropriate answer MUST include at the declared depth.

This map becomes the rubric the judge later grades responses against, so make the stages mutually exclusive, collectively exhaustive, and specific to the domain (not generic). Produce 4-6 stages.`

export async function POST(req: Request) {
  const { domain, audience, spec } = await req.json()

  const { output } = await generateText({
    model: "openai/gpt-5-mini",
    system: SYSTEM,
    prompt: `DOMAIN: ${domain}
TARGET AUDIENCE / DEPTH LEVEL: ${audience || "(unspecified)"}

VENDOR'S SPECIFICITY DECLARATION:
${spec}`,
    output: Output.object({ schema: domainMapSchema }),
  })

  return Response.json(output)
}
