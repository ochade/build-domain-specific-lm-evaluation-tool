"use client"

import { useState } from "react"
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { runs, domainStages, verdictMeta, type RunSummary, type Verdict } from "@/lib/data"
import { cn } from "@/lib/utils"

const metricDefs: { key: keyof RunSummary; label: string; suffix?: string; lowerIsBetter?: boolean }[] = [
  { key: "factuality", label: "Factuality" },
  { key: "specificity", label: "Specificity" },
  { key: "hallucinationRate", label: "Hallucination Rate", suffix: "%", lowerIsBetter: true },
  { key: "agreement", label: "Judge ↔ Expert", suffix: "%" },
]

function Delta({ value, lowerIsBetter }: { value: number; lowerIsBetter?: boolean }) {
  if (value === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" /> 0
      </span>
    )
  const good = lowerIsBetter ? value < 0 : value > 0
  const Icon = value > 0 ? TrendingUp : TrendingDown
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", good ? "text-success" : "text-destructive")}>
      <Icon className="size-3" />
      {value > 0 ? "+" : ""}
      {value}
    </span>
  )
}

export default function ComparePage() {
  const [baseId, setBaseId] = useState(runs[0].id)
  const [headId, setHeadId] = useState(runs[runs.length - 1].id)
  const base = runs.find((r) => r.id === baseId)!
  const head = runs.find((r) => r.id === headId)!

  const verdicts = Object.keys(verdictMeta) as Verdict[]

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 py-6 lg:px-6 lg:py-8">
        <h1 className="text-xl font-semibold tracking-tight">Compare runs</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Track how factuality, specificity, and hallucination behavior shift across model versions and where regressions hide.
        </p>

        {/* Run selectors */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <RunPicker label="Baseline" value={baseId} onChange={setBaseId} />
          <ArrowRight className="size-4 text-muted-foreground" />
          <RunPicker label="Comparison" value={headId} onChange={setHeadId} />
        </div>

        {/* Metric deltas */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metricDefs.map((m) => {
            const b = base[m.key] as number
            const h = head[m.key] as number
            return (
              <div key={m.key} className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">{m.label}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tabular-nums">
                    {h}
                    <span className="text-base text-muted-foreground">{m.suffix}</span>
                  </span>
                  <Delta value={h - b} lowerIsBetter={m.lowerIsBetter} />
                </div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">from {b}{m.suffix}</div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Per-stage coverage */}
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-medium">Reasoning-stage coverage</h2>
            <ul className="mt-4 space-y-4">
              {domainStages.map((stage) => {
                const b = base.stageCoverage[stage.id] ?? 0
                const h = head.stageCoverage[stage.id] ?? 0
                return (
                  <li key={stage.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{stage.name}</span>
                      <Delta value={h - b} />
                    </div>
                    <div className="mt-2 space-y-1">
                      <Bar value={b} muted />
                      <Bar value={h} />
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-muted-foreground/40" /> {base.version}</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-primary" /> {head.version}</span>
            </div>
          </section>

          {/* Claim verdict distribution */}
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-medium">Claim verdict distribution</h2>
            <div className="mt-4 space-y-5">
              {[base, head].map((run) => {
                const total = verdicts.reduce((acc, v) => acc + run.claimCounts[v], 0)
                return (
                  <div key={run.id}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium">{run.version}</span>
                      <span className="font-mono text-muted-foreground">{total} claims</span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full">
                      {verdicts.map((v) => {
                        const pct = (run.claimCounts[v] / total) * 100
                        if (!pct) return null
                        return <div key={v} className={cn("h-full", toneBar[verdictMeta[v].tone])} style={{ width: `${pct}%` }} />
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {verdicts.map((v) => (
                <li key={v} className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", toneBar[verdictMeta[v].tone])} />
                    {verdictMeta[v].label}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {base.claimCounts[v]} → {head.claimCounts[v]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}

const toneBar: Record<string, string> = {
  success: "bg-primary",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground/40",
}

function Bar({ value, muted }: { value: number; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full", muted ? "bg-muted-foreground/40" : "bg-primary")} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-xs text-muted-foreground">{value}</span>
    </div>
  )
}

function RunPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-input bg-secondary/40 px-2.5 py-1.5 text-sm outline-none focus:border-ring">
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {r.version} · {r.date}
          </option>
        ))}
      </select>
    </label>
  )
}
