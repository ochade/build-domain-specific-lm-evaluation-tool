import Link from "next/link"
import Image from "next/image"
import {
  Gavel,
  ArrowRight,
  ArrowRightCircle,
  Split,
  Search,
  ShieldCheck,
  BarChart3,
  HeartPulse,
  Scale,
  Landmark,
  UserCheck,
  ScrollText,
  GitBranch,
  Database,
  ShieldAlert,
  Check,
  X,
} from "lucide-react"

export const metadata = {
  title: "Adjudica — Agent-as-Judge for domain-specific LLMs",
  description:
    "Adjudica decomposes model responses into claims, retrieves your own reference evidence, and verifies each claim before it ever reaches a user.",
}

export default function WelcomePage() {
  return (
    <div className="bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-4 lg:px-6">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Gavel className="size-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Adjudica</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#who-its-for" className="transition-colors hover:text-foreground">
              Who it&apos;s for
            </a>
          </nav>
          <nav className="ml-auto flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in oklch, var(--color-primary) 16%, transparent), transparent)",
            }}
          />
          <div className="mx-auto max-w-[900px] px-4 pb-10 pt-20 text-center lg:px-6">
            <div className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground">
              <Split className="size-3.5" /> Agent-as-judge evaluation, not LLM-grading-LLM guesswork
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              Domain-specific LLMs fail silently. <span className="text-primary">Adjudica</span> catches
              hallucinations before your users do.
            </h1>
            <p className="mx-auto mt-5 max-w-[640px] text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              A model can sound completely confident about a clinical protocol, a legal citation, or a financial
              figure — and still be wrong. Adjudica decomposes every response into individual claims, retrieves
              evidence from your own reference documents, and verifies each claim before it reaches a real user.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Get started <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/60"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="mx-auto max-w-[1100px] px-4 pb-16 lg:px-6">
            <div className="overflow-hidden rounded-xl border border-border shadow-2xl shadow-primary/10">
              <Image
                src="/screenshot-dashboard.png"
                alt="A completed Adjudica evaluation run showing per-claim verdicts, citation evidence, factuality/hallucination scores, and the domain reasoning map"
                width={1440}
                height={1000}
                priority
                className="w-full"
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              A real evaluation run — the claims, citations, and scores above came from an actual judge pass, not a
              mockup.
            </p>
          </div>
        </section>

        {/* Problem */}
        <section className="border-t border-border bg-secondary/20 py-16">
          <div className="mx-auto max-w-[1000px] px-4 lg:px-6">
            <div className="text-center">
              <div className="text-xs font-medium uppercase tracking-wider text-primary">The problem</div>
              <h2 className="mx-auto mt-2 max-w-[700px] text-2xl font-semibold tracking-tight text-balance">
                Generic evals check fluency. They don&apos;t check whether your model is actually right.
              </h2>
              <p className="mx-auto mt-3 max-w-[640px] text-pretty leading-relaxed text-muted-foreground">
                Most LLM evaluation is a second model reading an answer and guessing whether it sounds correct. That
                works for tone and coherence. It does nothing to catch a domain-specific model confidently stating
                something false — because nothing in that process ever checks the claim against a real source.
              </p>
            </div>

            <div className="mx-auto mt-10 max-w-[800px]">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <HeartPulse className="size-4 text-destructive" /> Example: Clinical Cardiology — acute inferior
                STEMI management
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
                    <X className="size-3.5" /> What the model said
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                    Correctly identifies the syndrome, orders the right biomarkers — then states{" "}
                    <span className="font-medium">
                      thrombolysis is preferred over PCI in every case.
                    </span>{" "}
                    Fluent, well-structured, and dangerously wrong.
                  </p>
                </div>
                <div className="rounded-xl border border-success/25 bg-success/5 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-success">
                    <Check className="size-3.5" /> What the evidence says
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                    PCI is the preferred reperfusion strategy when available within the guideline window —
                    contradicting the model&apos;s claim outright, and citable directly from the ingested
                    guideline document.
                  </p>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground text-pretty">
                A judge that only asks &quot;does this sound reasonable?&quot; won&apos;t catch this. A judge that
                checks the claim against your actual clinical guidelines will.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-14 py-16">
          <div className="mx-auto max-w-[1200px] px-4 lg:px-6">
            <div className="text-center">
              <div className="text-xs font-medium uppercase tracking-wider text-primary">How it works</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance">
                A real pipeline, not one prompt guessing at everything
              </h2>
              <p className="mx-auto mt-3 max-w-[640px] text-pretty leading-relaxed text-muted-foreground">
                Four distinct steps, each doing one job well — and the two numbers that matter most, factuality and
                hallucination rate, are computed from the verdicts below, not self-reported by the model being
                judged.
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-0">
              <PipelineStep
                icon={<Split className="size-4" />}
                step="1. Decompose"
                title="Split into atomic claims"
                detail="The response is broken into independently checkable claims — one fact or recommendation per claim."
              />
              <PipelineArrow />
              <PipelineStep
                icon={<Search className="size-4" />}
                step="2. Retrieve"
                title="Evidence per claim"
                detail="Each claim gets its own similarity search against your ingested reference documents — not one search for the whole response."
              />
              <PipelineArrow />
              <PipelineStep
                icon={<ShieldCheck className="size-4" />}
                step="3. Verify"
                title="Check against real evidence"
                detail="Every claim is classified as supported, hallucinated, unsupported, or a retrieval gap — citing the specific evidence it was checked against."
              />
              <PipelineArrow />
              <PipelineStep
                icon={<BarChart3 className="size-4" />}
                step="4. Score"
                title="Computed, not guessed"
                detail="Factuality and hallucination rate are calculated directly from the verdicts above — an auditable number, not a model's self-assessment."
              />
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section id="who-its-for" className="scroll-mt-14 border-t border-border bg-secondary/20 py-16">
          <div className="mx-auto max-w-[1000px] px-4 lg:px-6">
            <div className="text-center">
              <div className="text-xs font-medium uppercase tracking-wider text-primary">Who it&apos;s for</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance">
                Teams shipping domain-specific models, wherever a confident wrong answer is costly
              </h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <AudienceCard
                icon={<HeartPulse className="size-5" />}
                title="Clinical"
                detail="Verify guideline-grounded reasoning before a model ever informs patient care."
              />
              <AudienceCard
                icon={<Scale className="size-5" />}
                title="Legal"
                detail="Catch fabricated citations and misstated precedent against your actual source documents."
              />
              <AudienceCard
                icon={<Landmark className="size-5" />}
                title="Financial"
                detail="Ground figures and regulatory claims in your own filings and policy documents, not model recall."
              />
            </div>
          </div>
        </section>

        {/* Trust / proof points */}
        <section className="py-16">
          <div className="mx-auto max-w-[1000px] px-4 lg:px-6">
            <div className="text-center">
              <div className="text-xs font-medium uppercase tracking-wider text-primary">Built to be trusted, not just believed</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance">
                The judge is checkable — including by humans
              </h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ProofPoint
                icon={<UserCheck className="size-4" />}
                title="Human calibration"
                detail="Reviewers confirm or override every verdict, producing a real, measured agreement rate — not a marketing number."
              />
              <ProofPoint
                icon={<ScrollText className="size-4" />}
                title="Full audit log"
                detail="Every evaluation, review, and data export is recorded — who did what, and when."
              />
              <ProofPoint
                icon={<GitBranch className="size-4" />}
                title="CI integration"
                detail="Trigger evaluations from your pipeline with an API key and get a synchronous, scriptable result."
              />
              <ProofPoint
                icon={<Database className="size-4" />}
                title="Your own evidence"
                detail="Claims are checked against documents you ingest — real retrieval, not a model's training-data recall."
              />
            </div>
          </div>
        </section>

        {/* Honest limitations */}
        <section className="border-t border-border py-16">
          <div className="mx-auto max-w-[800px] px-4 lg:px-6">
            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-5">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
              <div>
                <h2 className="text-sm font-semibold">What Adjudica doesn&apos;t do</h2>
                <ul className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-foreground/90">
                  <li className="flex gap-2">
                    <span className="text-muted-foreground">—</span> It is not a compliance product. Using it does
                    not make your deployment HIPAA-compliant or otherwise regulatorily certified — that requires
                    legal review and organizational policy, not software.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-muted-foreground">—</span> It does not replace expert review. &quot;Verified
                    reviewer&quot; status is an org owner vouching for a teammate, not an independently checked
                    credential.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-muted-foreground">—</span> It cannot guarantee correctness — only that
                    every claim was actually checked against real evidence, and that the checking is visible and
                    auditable instead of hidden inside one opaque model call.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border bg-secondary/20 py-16">
          <div className="mx-auto max-w-[600px] px-4 text-center lg:px-6">
            <h2 className="text-2xl font-semibold tracking-tight text-balance">Ready to verify your model?</h2>
            <p className="mt-2 text-pretty text-muted-foreground">
              Register a domain, ingest your reference documents, and run your first evaluation in a few minutes.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                <Check className="size-4" /> Get started
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row lg:px-6">
          <span>© {new Date().getFullYear()} Adjudica.</span>
          <span>Evaluates AI-generated text for factuality and specificity — not medical, legal, or financial advice.</span>
        </div>
      </footer>
    </div>
  )
}

function PipelineStep({
  icon,
  step,
  title,
  detail,
}: {
  icon: React.ReactNode
  step: string
  title: string
  detail: string
}) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-card p-4">
      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-primary">{step}</div>
      <p className="mt-1 text-sm font-medium">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  )
}

function PipelineArrow() {
  return (
    <div className="flex items-center justify-center py-1 lg:px-2 lg:py-0">
      <ArrowRightCircle className="size-5 rotate-90 text-muted-foreground/50 lg:rotate-0" />
    </div>
  )
}

function AudienceCard({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-foreground">{icon}</div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  )
}

function ProofPoint({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex size-8 items-center justify-center rounded-md bg-success/10 text-success">{icon}</div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  )
}
