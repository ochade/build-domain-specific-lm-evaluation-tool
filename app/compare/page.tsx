import Link from "next/link"
import { redirect } from "next/navigation"
import { Sparkles } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { CompareClient } from "@/components/compare-client"
import { listRuns, toRunSummary } from "@/lib/db/queries"
import { auth } from "@/lib/auth"

export default async function ComparePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const rows = await listRuns(session.user.organizationId, 20)
  const runs = rows.map(toRunSummary)

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 py-6 lg:px-6 lg:py-8">
        <h1 className="text-xl font-semibold tracking-tight">Compare runs</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Track how factuality, specificity, and hallucination behavior shift across model versions and where regressions hide.
        </p>

        {runs.length < 2 ? (
          <div className="mt-6 flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
            <Sparkles className="size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Run at least two evaluations to compare them.</p>
            <Link
              href="/evaluate"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Run an evaluation
            </Link>
          </div>
        ) : (
          <CompareClient runs={runs} />
        )}
      </main>
    </div>
  )
}
