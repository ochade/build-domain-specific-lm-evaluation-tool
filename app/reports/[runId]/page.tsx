import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getRun } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { VerdictBadge } from "@/components/verdict-badge"
import { PrintButton } from "@/components/print-button"

export default async function ReportPage({ params }: { params: Promise<{ runId: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const { runId } = await params
  const run = await getRun(session.user.organizationId, runId)
  if (!run) notFound()

  return (
    <div className="min-h-screen bg-background print:bg-white print:text-black">
      <div className="print:hidden flex items-center justify-between border-b border-border px-4 py-3 lg:px-6">
        <Link href="/data" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <PrintButton />
      </div>

      <main className="mx-auto max-w-[900px] px-6 py-8">
        <header className="border-b border-border pb-4 print:border-black/20">
          <div className="text-xs font-medium uppercase tracking-wider text-primary print:text-black">
            Adjudica evaluation report
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{run.model}</h1>
          <p className="mt-1 text-sm text-muted-foreground print:text-black/70">
            {run.domain} · Run {run.id.slice(0, 8)} · {run.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
          </p>
        </header>

        <section className="mt-6 grid grid-cols-4 gap-3">
          <ScoreBox label="Factuality" value={run.factuality} />
          <ScoreBox label="Specificity" value={run.specificity} />
          <ScoreBox label="Hallucination rate" value={run.hallucinationRate} />
          <ScoreBox label="Judge confidence" value={run.confidence} />
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold">Summary</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-pretty print:text-black/90">{run.summary}</p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold">Reasoning stage coverage</h2>
          <div className="mt-2 space-y-2">
            {run.stages.map((stage) => (
              <div key={stage.id} className="rounded-lg border border-border p-3 print:border-black/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stage.name}</span>
                  <span className="text-xs text-muted-foreground print:text-black/70">
                    {stage.coverage}% · {stage.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground print:text-black/70">{stage.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 break-inside-avoid">
          <h2 className="text-sm font-semibold">Claims ({run.claims.length})</h2>
          <div className="mt-2 space-y-2">
            {run.claims.map((claim) => (
              <div key={claim.id} className="break-inside-avoid rounded-lg border border-border p-3 print:border-black/20">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-pretty">{claim.text}</p>
                  <VerdictBadge verdict={claim.verdict} className="shrink-0" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground print:text-black/70">
                  Confidence {claim.confidence}% · {claim.evidenceGrounded ? "Evidence grounded" : "Not evidence grounded"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground print:text-black/70">
                  <span className="font-medium">Evidence:</span> {claim.evidence}
                </p>
                <p className="mt-1 text-xs text-muted-foreground print:text-black/70">
                  <span className="font-medium">Rationale:</span> {claim.rationale}
                </p>
              </div>
            ))}
          </div>
        </section>

        {run.improvements.length > 0 && (
          <section className="mt-6 break-inside-avoid">
            <h2 className="text-sm font-semibold">Recommended improvements</h2>
            <div className="mt-2 space-y-2">
              {run.improvements.map((improvement) => (
                <div key={improvement.id} className="break-inside-avoid rounded-lg border border-border p-3 print:border-black/20">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{improvement.title}</span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground print:text-black/70">
                      {improvement.severity} · {improvement.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground print:text-black/70">{improvement.detail}</p>
                  <p className="mt-1 text-xs text-muted-foreground print:text-black/70">
                    <span className="font-medium">Fix:</span> {improvement.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-8 border-t border-border pt-4 text-[11px] text-muted-foreground print:border-black/20 print:text-black/60">
          Generated by Adjudica. Do not treat this report or the evaluated content as medical advice — it evaluates
          AI-generated text for factuality and specificity, not clinical accuracy for real patient care.
        </footer>
      </main>
    </div>
  )
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3 print:border-black/20">
      <div className="text-xs text-muted-foreground print:text-black/70">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}%</div>
    </div>
  )
}
