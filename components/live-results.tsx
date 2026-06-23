"use client"

import type { EvaluationResult } from "@/lib/eval-schema"
import type { Verdict } from "@/lib/data"
import { VerdictBadge } from "@/components/verdict-badge"
import { cn } from "@/lib/utils"

const statusTone: Record<string, string> = {
  strong: "text-success",
  partial: "text-warning",
  weak: "text-destructive",
}

const sevTone: Record<string, string> = {
  critical: "bg-destructive/12 text-destructive border-destructive/25",
  major: "bg-warning/12 text-warning border-warning/25",
  minor: "bg-muted text-muted-foreground border-border",
}

function Metric({ label, value, suffix = "" }: { label: string; value?: number; suffix?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">
        {value == null ? "—" : Math.round(value)}
        <span className="text-base text-muted-foreground">{suffix}</span>
      </div>
    </div>
  )
}

export function LiveResults({ result }: { result: Partial<EvaluationResult> | undefined }) {
  if (!result) return null
  const claims = (result.claims ?? []).filter(Boolean)
  const stages = (result.stages ?? []).filter(Boolean)
  const improvements = (result.improvements ?? []).filter(Boolean)

  return (
    <div className="space-y-6">
      {result.summary && (
        <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm leading-relaxed text-foreground">
          {result.summary}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Factuality" value={result.factuality} />
        <Metric label="Specificity" value={result.specificity} />
        <Metric label="Hallucination Rate" value={result.hallucinationRate} suffix="%" />
        <Metric label="Judge Confidence" value={result.confidence} suffix="%" />
      </div>

      {claims.length > 0 && (
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 text-sm font-medium">
            Claim-Level Analysis
            <span className="ml-2 font-mono text-xs text-muted-foreground">{claims.length} claims</span>
          </div>
          <ul className="divide-y divide-border">
            {claims.map((c, i) => (
              <li key={i} className="space-y-2 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed text-pretty">{c?.text}</p>
                  {c?.verdict && <VerdictBadge verdict={c.verdict as Verdict} className="shrink-0" />}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {c?.stage && <span className="rounded bg-secondary px-1.5 py-0.5">{c.stage}</span>}
                  {c?.confidence != null && <span className="font-mono">conf {Math.round(c.confidence)}%</span>}
                </div>
                {c?.evidence && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Evidence: </span>
                    {c.evidence}
                  </p>
                )}
                {c?.rationale && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Rationale: </span>
                    {c.rationale}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {stages.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 text-sm font-medium">Domain Reasoning Coverage</div>
          <ul className="space-y-3">
            {stages.map((s, i) => (
              <li key={i}>
                <div className="flex items-center justify-between text-sm">
                  <span>{s?.name}</span>
                  <span className={cn("font-mono text-xs", s?.status && statusTone[s.status])}>
                    {s?.coverage != null ? `${Math.round(s.coverage)}%` : "—"}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      s?.status === "weak"
                        ? "bg-destructive"
                        : s?.status === "partial"
                          ? "bg-warning"
                          : "bg-primary",
                    )}
                    style={{ width: `${s?.coverage ?? 0}%` }}
                  />
                </div>
                {s?.note && <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {improvements.length > 0 && (
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 text-sm font-medium">Improvement Plan</div>
          <ul className="divide-y divide-border">
            {improvements.map((imp, i) => (
              <li key={i} className="space-y-2 px-4 py-3">
                <div className="flex items-center gap-2">
                  {imp?.severity && (
                    <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium capitalize", sevTone[imp.severity])}>
                      {imp.severity}
                    </span>
                  )}
                  {imp?.category && <span className="text-xs text-muted-foreground">{imp.category}</span>}
                </div>
                <p className="text-sm font-medium">{imp?.title}</p>
                {imp?.detail && <p className="text-xs leading-relaxed text-muted-foreground">{imp.detail}</p>}
                {imp?.recommendation && (
                  <p className="rounded-md bg-secondary/50 px-3 py-2 text-xs leading-relaxed">
                    <span className="font-medium text-primary">Fix: </span>
                    {imp.recommendation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
