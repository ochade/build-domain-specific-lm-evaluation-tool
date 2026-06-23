"use client"

import { useState } from "react"
import { claims, transcript, evaluation, verdictMeta } from "@/lib/data"
import { VerdictBadge } from "@/components/verdict-badge"
import { cn } from "@/lib/utils"
import { Quote, ChevronRight } from "lucide-react"

const segTone: Record<string, string> = {
  success: "decoration-success/60",
  warning: "decoration-warning/70",
  destructive: "decoration-destructive/70",
  muted: "decoration-muted-foreground/50",
}

export function AnalysisPanel() {
  const [selected, setSelected] = useState<string>("c5")
  const active = claims.find((c) => c.id === selected)

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Claim-Level Analysis</h2>
          <p className="text-xs text-muted-foreground">{claims.length} atomic claims verified against domain evidence</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5">
        {/* Transcript with highlighted spans */}
        <div className="border-b border-border p-4 lg:col-span-3 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Quote className="size-3.5" />
            <span className="line-clamp-1">{evaluation.prompt}</span>
          </div>
          <p className="text-pretty text-sm leading-relaxed text-foreground/90">
            {transcript.map((seg, i) => {
              if (!seg.claimId) return <span key={i}>{seg.text}</span>
              const claim = claims.find((c) => c.id === seg.claimId)!
              const tone = verdictMeta[claim.verdict].tone
              const isActive = selected === seg.claimId
              return (
                <button
                  key={i}
                  onClick={() => setSelected(seg.claimId!)}
                  className={cn(
                    "cursor-pointer rounded underline decoration-2 underline-offset-4 transition-colors",
                    segTone[tone],
                    isActive ? "bg-secondary text-foreground" : "hover:bg-secondary/60",
                  )}
                >
                  {seg.text}
                </button>
              )
            })}
          </p>

          <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
            {Object.entries(verdictMeta).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-0.5 w-4 rounded-full",
                    v.tone === "success" && "bg-success",
                    v.tone === "warning" && "bg-warning",
                    v.tone === "destructive" && "bg-destructive",
                    v.tone === "muted" && "bg-muted-foreground/60",
                  )}
                />
                {v.label}
              </span>
            ))}
          </div>
        </div>

        {/* Claim list + detail */}
        <div className="lg:col-span-2">
          <ul className="max-h-[260px] divide-y divide-border overflow-y-auto">
            {claims.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelected(c.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-secondary/50",
                    selected === c.id && "bg-secondary/60",
                  )}
                >
                  <span className="font-mono text-[10px] text-muted-foreground">{c.id}</span>
                  <span className="line-clamp-1 flex-1 text-xs text-foreground/90">{c.text}</span>
                  <VerdictBadge verdict={c.verdict} />
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>

          {active && (
            <div className="space-y-3 border-t border-border bg-background/40 p-4">
              <div className="flex items-center justify-between">
                <VerdictBadge verdict={active.verdict} />
                <span className="font-mono text-xs text-muted-foreground">
                  judge conf. {active.confidence}%
                </span>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Evidence</p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/80">{active.evidence}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Judge rationale</p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/80">{active.rationale}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
