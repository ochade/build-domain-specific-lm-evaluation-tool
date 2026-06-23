import { judgeTrace, evaluation } from "@/lib/data"
import { Cpu } from "lucide-react"

export function JudgeTrace() {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Agentic Judge Trace</h2>
          <p className="text-xs text-muted-foreground">How the verdict was reached</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          <Cpu className="size-3" /> {evaluation.humanAgreement * 100}% expert match
        </span>
      </div>
      <ol className="divide-y divide-border">
        {judgeTrace.map((step, i) => (
          <li key={step.id} className="flex gap-3 px-4 py-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[10px] text-muted-foreground">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">{step.phase}</span>
                {step.tool && (
                  <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {step.tool}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm font-medium">{step.action}</p>
              <p className="text-xs text-muted-foreground">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
