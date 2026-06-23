import { TopNav } from "@/components/top-nav"
import { RunHeader } from "@/components/run-header"
import { ScoreCards } from "@/components/score-cards"
import { AnalysisPanel } from "@/components/analysis-panel"
import { DomainMap } from "@/components/domain-map"
import { ImprovementsPanel } from "@/components/improvements-panel"
import { JudgeTrace } from "@/components/judge-trace"
import { TrendChart } from "@/components/trend-chart"

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6 lg:py-8">
        <RunHeader />

        <div className="mt-6 space-y-6">
          <ScoreCards />

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <AnalysisPanel />
              <ImprovementsPanel />
            </div>
            <div className="space-y-6 lg:col-span-4">
              <DomainMap />
              <TrendChart />
              <JudgeTrace />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
