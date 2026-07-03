import { redirect } from "next/navigation"
import { TopNav } from "@/components/top-nav"
import { listAuditLog } from "@/lib/db/queries"
import { auth } from "@/lib/auth"

export default async function AuditLogPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const events = await listAuditLog(session.user.organizationId, 100)

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 py-6 lg:px-6 lg:py-8">
        <h1 className="text-xl font-semibold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          A record of security-relevant actions for your organization: logins, evaluations, data changes, and
          exports. A real technical control — not a substitute for a full compliance/security review.
        </p>

        <section className="mt-6 rounded-xl border border-border bg-card">
          {events.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No audit events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Time</th>
                    <th className="px-4 py-2 font-medium">Action</th>
                    <th className="px-4 py-2 font-medium">Actor</th>
                    <th className="px-4 py-2 font-medium">Resource</th>
                    <th className="px-4 py-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-muted-foreground">
                        {e.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                      </td>
                      <td className="px-4 py-2">
                        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono">{e.action}</span>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{e.userEmail ?? "—"}</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">
                        {e.resourceType ? `${e.resourceType}${e.resourceId ? `:${e.resourceId.slice(0, 8)}` : ""}` : "—"}
                      </td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">{e.ipAddress ?? "—"}</td>
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
