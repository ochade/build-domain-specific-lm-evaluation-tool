"use client"

import { useState } from "react"
import { ShieldQuestion } from "lucide-react"
import type { CalibrationSummary } from "@/lib/db/queries"

export function CalibrationView({
  all,
  verifiedOnly,
  totalClaims,
}: {
  all: CalibrationSummary
  verifiedOnly: CalibrationSummary
  totalClaims: number
}) {
  const [segment, setSegment] = useState<"all" | "verified">("all")
  const calibration = segment === "all" ? all : verifiedOnly
  const coverage = totalClaims > 0 ? Math.round((calibration.totalReviewed / totalClaims) * 100) : 0

  return (
    <div>
      <div className="mt-6 flex items-center gap-1.5 rounded-md border border-border bg-secondary/30 p-1 text-xs">
        <button
          onClick={() => setSegment("all")}
          className={
            segment === "all"
              ? "rounded px-3 py-1.5 font-medium text-foreground bg-card"
              : "rounded px-3 py-1.5 text-muted-foreground hover:text-foreground"
          }
        >
          All reviewers
        </button>
        <button
          onClick={() => setSegment("verified")}
          className={
            segment === "verified"
              ? "rounded px-3 py-1.5 font-medium text-foreground bg-card"
              : "rounded px-3 py-1.5 text-muted-foreground hover:text-foreground"
          }
        >
          Verified reviewers only
        </button>
      </div>
      {segment === "verified" && (
        <p className="mt-2 text-xs text-muted-foreground text-pretty">
          &quot;Verified&quot; means an org owner vouched for this reviewer in <span className="font-mono">/admin</span>
          — Adjudica does not independently check credentials or licenses.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Claims ever judged" value={totalClaims.toLocaleString()} />
        <StatCard label="Claims human-reviewed" value={`${calibration.totalReviewed.toLocaleString()} (${coverage}%)`} />
        <StatCard
          label="Overall agreement rate"
          value={calibration.overallAgreementRate != null ? `${calibration.overallAgreementRate}%` : "No data yet"}
        />
      </div>

      {calibration.totalReviewed === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-10 text-center">
          <ShieldQuestion className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-pretty">
            {segment === "all"
              ? "No claims have been human-reviewed yet. Open any evaluation on the dashboard and confirm or override a claim's verdict — this page fills in with a real calibration measurement as reviews accumulate."
              : "No verified reviewers have reviewed a claim yet. Mark a teammate as a verified reviewer in /admin, then have them confirm or override a claim's verdict."}
          </p>
        </div>
      ) : (
        <section className="mt-6 rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Calibration by confidence bucket</h2>
            <p className="text-xs text-muted-foreground">
              If the judge is well-calibrated, agreement rate should track the confidence bucket (e.g. ~90-100%
              agreement for claims where the judge reported 90-100% confidence).
            </p>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Judge confidence</th>
                <th className="px-4 py-2 font-medium">Reviewed claims</th>
                <th className="px-4 py-2 font-medium">Actual agreement rate</th>
              </tr>
            </thead>
            <tbody>
              {calibration.buckets.map((b) => (
                <tr key={b.label} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{b.label}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{b.count}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {b.agreementRate != null ? `${b.agreementRate}%` : <span className="text-muted-foreground">no data</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}
