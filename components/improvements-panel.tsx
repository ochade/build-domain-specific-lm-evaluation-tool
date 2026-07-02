import type { Improvement } from "@/lib/data"
import { cn } from "@/lib/utils"
import { Lightbulb, ArrowRight } from "lucide-react"

const severityMeta = {
  critical: "border-destructive/30 bg-destructive/10 text-destructive",
  major: "border-warning/30 bg-warning/10 text-warning",
  minor: "border-border bg-muted text-muted-foreground",
} as const

export function ImprovementsPanel({ improvements }: { improvements: Improvement[] }) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Improvement Diagnostics</h2>
          <p className="text-xs text-muted-foreground">Root-cause-tagged, prioritized recommendations</p>
        </div>
        <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {improvements.length} findings
        </span>
      </div>
      <ul className="divide-y divide-border">
        {improvements.map((item) => (
          <li key={item.id} className="p-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  severityMeta[item.severity],
                )}
              >
                {item.severity}
              </span>
              <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {item.category}
              </span>
            </div>
            <h3 className="mt-2 text-sm font-medium text-balance">{item.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
            <div className="mt-2 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-2.5">
              <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-foreground/85">{item.recommendation}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-border p-3">
        <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80">
          Open full remediation plan <ArrowRight className="size-3.5" />
        </button>
      </div>
    </section>
  )
}
