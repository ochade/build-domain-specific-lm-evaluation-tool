import { scores } from "@/lib/data"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

function Ring({ value, invert }: { value: number; invert?: boolean }) {
  const r = 20
  const c = 2 * Math.PI * r
  const pct = invert ? 100 - value : value
  const offset = c - (pct / 100) * c
  const tone = pct >= 75 ? "text-primary" : pct >= 50 ? "text-warning" : "text-destructive"
  return (
    <svg viewBox="0 0 48 48" className="size-12 -rotate-90">
      <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className={tone}
      />
    </svg>
  )
}

export function ScoreCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {scores.map((s) => {
        const isHallucination = s.key === "hallucination"
        const good = isHallucination ? s.delta <= 0 : s.delta >= 0
        return (
          <div key={s.key} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">
                  {s.value}
                  <span className="text-base text-muted-foreground">%</span>
                </p>
              </div>
              <Ring value={s.value} invert={isHallucination} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.caption}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium",
                  good ? "text-success" : "text-destructive",
                )}
              >
                {s.delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {Math.abs(s.delta)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
