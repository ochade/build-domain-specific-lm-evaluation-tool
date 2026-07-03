import { redirect } from "next/navigation"
import Link from "next/link"
import { TopNav } from "@/components/top-nav"
import { ModelsTable } from "@/components/models-table"
import { listRegisteredModels } from "@/lib/db/queries"
import { auth } from "@/lib/auth"

export default async function ModelsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const models = await listRegisteredModels(session.user.organizationId, 100)

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 py-6 lg:px-6 lg:py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Registered Models</h1>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Domains and models onboarded for your organization. Rename or remove a registration here.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Register a model
          </Link>
        </div>

        <section className="mt-6 rounded-xl border border-border bg-card">
          <ModelsTable
            models={models.map((m) => ({
              id: m.id,
              model: m.model,
              domain: m.domain,
              audience: m.audience,
              createdAt: m.createdAt.toISOString(),
            }))}
          />
        </section>
      </main>
    </div>
  )
}
