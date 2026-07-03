import type { EvaluationRunRow } from "@/lib/db/schema"
import { Cpu } from "lucide-react"

function buildSteps(run: EvaluationRunRow) {
  return [
    {
      phase: "Decompose",
      action: `Atomized the response into ${run.claims.length} claims`,
      detail: "A first model call split the response into atomic, independently verifiable claims — no judgment yet.",
    },
    {
      phase: "Retrieve",
      action: "Retrieved evidence for each claim separately",
      detail: "A real vector search ran once per claim against the domain's ingested reference documents, not once for the whole response.",
    },
    {
      phase: "Verify",
      action: "Ran entailment checks against each claim's own evidence",
      detail: "A second model call classified each claim as supported, hallucinated, unsupported, or a retrieval gap, citing only the evidence retrieved for that specific claim.",
    },
    {
      phase: "Diagnose",
      action: `Produced ${run.improvements.length} improvement recommendations`,
      detail: "The same verification call mapped claims to reasoning stages and generated prioritized, root-cause-tagged fixes for the vendor.",
    },
    {
      phase: "Score",
      action: `Computed factuality, hallucination rate, and confidence from ${run.claims.length} verdicts`,
      detail: "These top-line numbers are computed deterministically from the verdicts above, not self-reported by the model.",
    },
  ]
}

export function JudgeTrace({ run }: { run: EvaluationRunRow }) {
  const steps = buildSteps(run)
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Judge Trace</h2>
          <p className="text-xs text-muted-foreground">What the structured judge call did</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          <Cpu className="size-3" /> {run.confidence}% judge confidence
        </span>
      </div>
      <ol className="divide-y divide-border">
        {steps.map((step, i) => (
          <li key={step.phase} className="flex gap-3 px-4 py-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[10px] text-muted-foreground">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">{step.phase}</span>
              <p className="mt-0.5 text-sm font-medium">{step.action}</p>
              <p className="text-xs text-muted-foreground">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
