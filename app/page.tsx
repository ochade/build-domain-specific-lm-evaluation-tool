import Link from "next/link"
import { redirect } from "next/navigation"
import { Sparkles } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { RunHeader } from "@/components/run-header"
import { ScoreCards } from "@/components/score-cards"
import { AnalysisPanel } from "@/components/analysis-panel"
import { DomainMap } from "@/components/domain-map"
import { ImprovementsPanel } from "@/components/improvements-panel"
import { JudgeTrace } from "@/components/judge-trace"
import { TrendChart } from "@/components/trend-chart"
import { listRuns, toScoreMetrics } from "@/lib/db/queries"
import { auth } from "@/lib/auth"

export default async function Page() {
  const session = await auth()
  if (!session) redirect("/login")

  const runs = await listRuns(session.user.organizationId, 6)
  const latest = runs[0]
  const previous = runs[1]

  if (!latest) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6 lg:py-8">
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
            <Sparkles className="size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No evaluations yet.</p>
            <Link
              href="/evaluate"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Run your first evaluation
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const metrics = toScoreMetrics(latest, previous)
  const trend = [...runs].reverse().map((r) => ({
    run: r.model,
    factuality: r.factuality,
    specificity: r.specificity,
  }))

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6 lg:py-8">
        <RunHeader run={latest} />

        <div className="mt-6 space-y-6">
          <ScoreCards metrics={metrics} />

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <AnalysisPanel
                runId={latest.id}
                prompt={latest.prompt}
                claims={latest.claims}
                transcript={latest.transcript}
                retrievedEvidence={latest.retrievedEvidence}
              />
              <ImprovementsPanel improvements={latest.improvements} />
            </div>
            <div className="space-y-6 lg:col-span-4">
              <DomainMap stages={latest.stages} />
              <TrendChart trend={trend} />
              <JudgeTrace run={latest} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
