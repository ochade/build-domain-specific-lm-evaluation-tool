import { redirect } from "next/navigation"
import { CheckCircle2, XCircle } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { listLlmCalls, getLlmUsageSummary } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { cn } from "@/lib/utils"

function formatCost(usd: number) {
  return usd > 0 && usd < 0.01 ? "<$0.01" : `$${usd.toFixed(2)}`
}

export default async function UsagePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [summary, calls] = await Promise.all([
    getLlmUsageSummary(session.user.organizationId),
    listLlmCalls(session.user.organizationId, 50),
  ])

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 py-6 lg:px-6 lg:py-8">
        <h1 className="text-xl font-semibold tracking-tight">LLM Usage</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Every judge, domain-mapping, and embedding call, with token counts and an estimated cost.{" "}
          <span className="text-foreground/70">
            Cost figures are best-effort estimates — reconcile against your actual provider billing.
          </span>
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Total calls" value={summary.totalCalls.toLocaleString()} />
          <StatCard label="Success rate" value={`${summary.successRate}%`} />
          <StatCard label="Input tokens" value={summary.totalInputTokens.toLocaleString()} />
          <StatCard label="Output tokens" value={summary.totalOutputTokens.toLocaleString()} />
          <StatCard label="Est. cost (all-time)" value={formatCost(summary.totalEstimatedCostUsd)} />
        </div>

        <section className="mt-6 rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent calls</h2>
          </div>
          {calls.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No LLM calls logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Time</th>
                    <th className="px-4 py-2 font-medium">Route</th>
                    <th className="px-4 py-2 font-medium">Model</th>
                    <th className="px-4 py-2 font-medium">Tokens (in/out)</th>
                    <th className="px-4 py-2 font-medium">Est. cost</th>
                    <th className="px-4 py-2 font-medium">Latency</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-muted-foreground">
                        {c.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                      </td>
                      <td className="px-4 py-2">
                        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono">{c.route}</span>
                      </td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">{c.model}</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">
                        {c.inputTokens ?? "—"} / {c.outputTokens ?? "—"}
                      </td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">
                        {c.estimatedCostUsd != null ? formatCost(c.estimatedCostUsd) : "—"}
                      </td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">{c.latencyMs}ms</td>
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            c.success ? "text-success" : "text-destructive",
                          )}
                          title={c.errorMessage ?? undefined}
                        >
                          {c.success ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                          {c.success ? "OK" : "Failed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
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
