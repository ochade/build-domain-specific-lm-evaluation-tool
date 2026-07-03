import { redirect } from "next/navigation"
import { TopNav } from "@/components/top-nav"
import { TeamSection, ApiKeysSection } from "@/components/admin-panel"
import { listOrgMembers, listPendingInvites, listApiKeys } from "@/lib/db/queries"
import { auth } from "@/lib/auth"

export default async function AdminPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "owner") redirect("/")

  const [members, invites, apiKeys] = await Promise.all([
    listOrgMembers(session.user.organizationId),
    listPendingInvites(session.user.organizationId),
    listApiKeys(session.user.organizationId),
  ])

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 py-6 lg:px-6 lg:py-8">
        <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Manage your team and API keys for CI-triggered evaluations. Only organization owners can see this page.
        </p>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Team</h2>
          <div className="mt-2">
            <TeamSection
              members={members.map((m) => ({
                id: m.id,
                email: m.email,
                name: m.name,
                role: m.role,
                createdAt: m.createdAt.toISOString(),
                isVerifiedReviewer: m.isVerifiedReviewer,
              }))}
              invites={invites.map((i) => ({
                id: i.id,
                email: i.email,
                role: i.role,
                createdAt: i.createdAt.toISOString(),
                expiresAt: i.expiresAt.toISOString(),
              }))}
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground">API keys</h2>
          <div className="mt-2">
            <ApiKeysSection
              apiKeys={apiKeys.map((k) => ({
                id: k.id,
                name: k.name,
                keyPrefix: k.keyPrefix,
                createdAt: k.createdAt.toISOString(),
                lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
                revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null,
              }))}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
