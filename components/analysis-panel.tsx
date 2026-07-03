"use client"

import { useEffect, useState } from "react"
import type { Claim, RetrievedEvidenceChunk, TranscriptSegment, Verdict } from "@/lib/data"
import { verdictMeta } from "@/lib/data"
import { VerdictBadge } from "@/components/verdict-badge"
import { cn } from "@/lib/utils"
import { Quote, ChevronRight, ShieldCheck, ShieldAlert, Library, Check, X, UserCheck } from "lucide-react"

interface ClaimReview {
  claimId: string
  humanVerdict: Verdict
  agrees: boolean
  note: string | null
  reviewerName: string | null
  reviewerVerified: boolean | null
}

const verdictOptions = Object.keys(verdictMeta) as Verdict[]

const segTone: Record<string, string> = {
  success: "decoration-success/60",
  warning: "decoration-warning/70",
  destructive: "decoration-destructive/70",
  muted: "decoration-muted-foreground/50",
}

export function AnalysisPanel({
  runId,
  prompt,
  claims,
  transcript,
  retrievedEvidence,
}: {
  runId: string
  prompt: string
  claims: Claim[]
  transcript: TranscriptSegment[] | null
  retrievedEvidence: RetrievedEvidenceChunk[] | null
}) {
  const [selected, setSelected] = useState<string | undefined>(claims[0]?.id)
  const active = claims.find((c) => c.id === selected)
  const [reviews, setReviews] = useState<Record<string, ClaimReview>>({})
  const [overrideVerdict, setOverrideVerdict] = useState<Verdict | "">("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/reviews?runId=${runId}`)
      .then((res) => res.json())
      .then((rows: ClaimReview[]) => {
        setReviews(Object.fromEntries(rows.map((r) => [r.claimId, r])))
      })
      .catch(() => {})
  }, [runId])

  function selectClaim(claimId: string) {
    setSelected(claimId)
    setOverrideVerdict("")
    setNote("")
  }

  async function submitReview(humanVerdict: Verdict) {
    if (!active) return
    setSaving(true)
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, claimId: active.id, humanVerdict, note: note || null }),
      })
      if (res.ok) {
        // Refetch (rather than merge the POST response locally) so the
        // reviewer name/verified badge reflects the real joined data.
        const rows: ClaimReview[] = await fetch(`/api/reviews?runId=${runId}`).then((r) => r.json())
        setReviews(Object.fromEntries(rows.map((r) => [r.claimId, r])))
        setOverrideVerdict("")
        setNote("")
      }
    } finally {
      setSaving(false)
    }
  }

  const activeReview = active ? reviews[active.id] : undefined

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
            <span className="line-clamp-1">{prompt}</span>
          </div>
          {transcript ? (
            <p className="text-pretty text-sm leading-relaxed text-foreground/90">
              {transcript.map((seg, i) => {
                if (!seg.claimId) return <span key={i}>{seg.text}</span>
                const claim = claims.find((c) => c.id === seg.claimId)
                if (!claim) return <span key={i}>{seg.text}</span>
                const tone = verdictMeta[claim.verdict].tone
                const isActive = selected === seg.claimId
                return (
                  <button
                    key={i}
                    onClick={() => selectClaim(seg.claimId!)}
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
          ) : (
            <p className="text-xs text-muted-foreground">
              Inline claim highlighting isn&apos;t available for this run — see the claim list for details.
            </p>
          )}

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
                  onClick={() => selectClaim(c.id)}
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
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                  active.evidenceGrounded
                    ? "border-success/25 bg-success/12 text-success"
                    : "border-warning/25 bg-warning/12 text-warning",
                )}
              >
                {active.evidenceGrounded ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
                {active.evidenceGrounded ? "Cites verified retrieved evidence" : "No verified [E#] citation"}
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Evidence</p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/80">{active.evidence}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Judge rationale</p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/80">{active.rationale}</p>
              </div>

              <div className="rounded-md border border-border bg-card p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <UserCheck className="size-3.5" /> Human review
                </p>
                {activeReview ? (
                  <div className="mt-2 space-y-1">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium",
                        activeReview.agrees ? "text-success" : "text-destructive",
                      )}
                    >
                      {activeReview.agrees ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                      {activeReview.agrees
                        ? "Confirmed — human agrees with the judge"
                        : `Overridden — human says "${verdictMeta[activeReview.humanVerdict].label}"`}
                      {activeReview.note && <span className="text-muted-foreground">· {activeReview.note}</span>}
                    </div>
                    {activeReview.reviewerName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>Reviewed by {activeReview.reviewerName}</span>
                        {activeReview.reviewerVerified && (
                          <span
                            className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-success"
                            title="Org-attested only — not independently verified against any licensing service."
                          >
                            <ShieldCheck className="size-3" /> Verified reviewer
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    <button
                      onClick={() => submitReview(active.verdict)}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success transition-opacity hover:opacity-80 disabled:opacity-50"
                    >
                      <Check className="size-3.5" /> Confirm judge&apos;s verdict
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={overrideVerdict}
                        onChange={(e) => setOverrideVerdict(e.target.value as Verdict)}
                        className="rounded-md border border-input bg-secondary/40 px-2 py-1 text-xs outline-none"
                      >
                        <option value="">Override with…</option>
                        {verdictOptions
                          .filter((v) => v !== active.verdict)
                          .map((v) => (
                            <option key={v} value={v}>
                              {verdictMeta[v].label}
                            </option>
                          ))}
                      </select>
                      <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Optional note"
                        className="min-w-0 flex-1 rounded-md border border-input bg-secondary/40 px-2 py-1 text-xs outline-none"
                      />
                      <button
                        onClick={() => overrideVerdict && submitReview(overrideVerdict)}
                        disabled={!overrideVerdict || saving}
                        className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive transition-opacity hover:opacity-80 disabled:opacity-50"
                      >
                        <X className="size-3.5" /> Override
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {retrievedEvidence && retrievedEvidence.length > 0 && (
        <div className="border-t border-border p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Library className="size-3.5" />
            Retrieved evidence used for this run ({retrievedEvidence.length} chunks)
          </div>
          <ul className="space-y-2">
            {retrievedEvidence.map((e) => (
              <li key={e.tag} className="rounded-md border border-border bg-background/60 p-2.5">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-muted-foreground">[{e.tag}]</span>
                  <span className="font-medium text-foreground/90">{e.documentTitle}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
