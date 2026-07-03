import { redirect } from "next/navigation"
import { TopNav } from "@/components/top-nav"
import { CalibrationView } from "@/components/calibration-view"
import { getCalibrationSummary, getTotalJudgedClaimsCount } from "@/lib/db/queries"
import { auth } from "@/lib/auth"

export default async function QualityPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [calibration, totalClaims] = await Promise.all([
    getCalibrationSummary(session.user.organizationId),
    getTotalJudgedClaimsCount(session.user.organizationId),
  ])

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1000px] px-4 py-6 lg:px-6 lg:py-8">
        <h1 className="text-xl font-semibold tracking-tight">Judge Quality &amp; Calibration</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          A real, measured agreement rate between the judge and human reviewers — computed from actual reviews recorded
          on the dashboard, not a fixed marketing number.
        </p>

        <CalibrationView all={calibration.all} verifiedOnly={calibration.verifiedOnly} totalClaims={totalClaims} />
      </main>
    </div>
  )
}
