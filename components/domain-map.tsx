import { domainStages } from "@/lib/data"
import { cn } from "@/lib/utils"
import { Check, Minus, AlertTriangle } from "lucide-react"

const statusMeta = {
  strong: { ring: "border-success/40 bg-success/10 text-success", Icon: Check, label: "Covered" },
  partial: { ring: "border-warning/40 bg-warning/10 text-warning", Icon: Minus, label: "Partial" },
  weak: { ring: "border-destructive/40 bg-destructive/10 text-destructive", Icon: AlertTriangle, label: "Gap" },
} as const

function barTone(status: keyof typeof statusMeta) {
  return status === "strong" ? "bg-success" : status === "partial" ? "bg-warning" : "bg-destructive"
}

export function DomainMap() {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Domain Reasoning Map</h2>
          <p className="text-xs text-muted-foreground">Derived from the vendor&apos;s declared specificity spec</p>
        </div>
        <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          5 stages
        </span>
      </div>

      <ol className="p-4">
        {domainStages.map((stage, i) => {
          const meta = statusMeta[stage.status]
          return (
            <li key={stage.id} className="relative flex gap-3 pb-5 last:pb-0">
              {i < domainStages.length - 1 && (
                <span className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-border" aria-hidden />
              )}
              <div
                className={cn(
                  "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border",
                  meta.ring,
                )}
              >
                <meta.Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-medium">{stage.name}</h3>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{stage.coverage}%</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{stage.description}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", barTone(stage.status))}
                    style={{ width: `${stage.coverage}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {stage.expected.map((e) => (
                    <span
                      key={e}
                      className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
