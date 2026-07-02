import { redirect } from "next/navigation"
import { ShieldQuestion } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { getCalibrationSummary, getTotalJudgedClaimsCount } from "@/lib/db/queries"
import { auth } from "@/lib/auth"

export default async function QualityPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [calibration, totalClaims] = await Promise.all([
    getCalibrationSummary(session.user.organizationId),
    getTotalJudgedClaimsCount(session.user.organizationId),
  ])

  const coverage = totalClaims > 0 ? Math.round((calibration.totalReviewed / totalClaims) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1000px] px-4 py-6 lg:px-6 lg:py-8">
        <h1 className="text-xl font-semibold tracking-tight">Judge Quality &amp; Calibration</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          A real, measured agreement rate between the judge and human reviewers — computed from actual reviews recorded
          on the dashboard, not a fixed marketing number.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
              No claims have been human-reviewed yet. Open any evaluation on the dashboard and confirm or override a
              claim&apos;s verdict — this page fills in with a real calibration measurement as reviews accumulate.
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
      </main>
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
