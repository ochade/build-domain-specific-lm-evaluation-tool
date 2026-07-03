import { redirect } from "next/navigation"
import { TopNav } from "@/components/top-nav"
import { listRuns } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { ExportButton, RunsTable } from "@/components/data-controls"

export default async function DataPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const { q } = await searchParams
  const runs = await listRuns(session.user.organizationId, 100, q)

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 py-6 lg:px-6 lg:py-8">
        <h1 className="text-xl font-semibold tracking-tight">Your Data</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Export everything stored for your organization, or permanently delete individual evaluation runs.
        </p>

        <div className="mt-6">
          <ExportButton />
        </div>

        <section className="mt-6 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Evaluation runs{q ? ` — results for "${q}"` : ""}</h2>
            <form className="flex items-center gap-2" action="/data">
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search model, domain, prompt…"
                className="input h-8 w-64 text-xs"
              />
              {q && (
                <a href="/data" className="text-xs text-muted-foreground hover:text-foreground">
                  Clear
                </a>
              )}
            </form>
          </div>
          <RunsTable
            runs={runs.map((r) => ({
              id: r.id,
              model: r.model,
              domain: r.domain,
              createdAt: r.createdAt.toISOString(),
            }))}
          />
        </section>
      </main>
    </div>
  )
}
