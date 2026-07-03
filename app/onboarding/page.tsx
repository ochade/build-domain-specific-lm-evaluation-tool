"use client"

import { useState } from "react"
import { Check, ChevronRight, ChevronLeft, Upload, Loader2, Workflow, AlertCircle, FileText, X } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { ComplianceNotice } from "@/components/compliance-notice"
import { cn } from "@/lib/utils"
import type { DomainMap } from "@/lib/eval-schema"

interface EvidenceDoc {
  id: string
  title: string
  chunkCount: number
}

const steps = ["Declare domain", "Provide specification", "Derive reasoning map", "Review & confirm"]

const audiences = ["General / consumer", "Practitioner", "Expert / specialist", "Regulatory / safety-critical"]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [model, setModel] = useState("")
  const [domain, setDomain] = useState("")
  const [audience, setAudience] = useState(audiences[2])
  const [spec, setSpec] = useState("")
  const [fileName, setFileName] = useState("")
  const [map, setMap] = useState<DomainMap | null>(null)
  const [registeredId, setRegisteredId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [evidenceDocs, setEvidenceDocs] = useState<EvidenceDoc[]>([])
  const [evidenceUploading, setEvidenceUploading] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    setSpec((prev) => (prev ? `${prev}\n\n${text}` : text))
  }

  async function onEvidenceFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0 || !domain.trim()) return
    setEvidenceUploading(true)
    try {
      for (const file of files) {
        const text = await file.text()
        const res = await fetch("/api/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain, title: file.name, text }),
        })
        if (res.ok) {
          const doc = await res.json()
          setEvidenceDocs((prev) => [...prev, { id: doc.id, title: file.name, chunkCount: doc.chunkCount ?? 0 }])
        }
      }
    } finally {
      setEvidenceUploading(false)
      e.target.value = ""
    }
  }

  async function removeEvidenceDoc(id: string) {
    setEvidenceDocs((prev) => prev.filter((d) => d.id !== id))
    await fetch(`/api/evidence/${id}`, { method: "DELETE" }).catch(() => {})
  }

  async function derive() {
    setLoading(true)
    setError(false)
    setMap(null)
    setRegisteredId(null)
    try {
      const res = await fetch("/api/derive-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, domain, audience, spec }),
      })
      if (!res.ok) throw new Error()
      const { id, ...map } = (await res.json()) as DomainMap & { id: string }
      setRegisteredId(id)
      setMap(map)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const canNext =
    step === 0 ? domain.trim() && model.trim() : step === 1 ? spec.trim().length > 20 : true

  function next() {
    if (step === 1) {
      setStep(2)
      derive()
      return
    }
    setStep((s) => Math.min(s + 1, steps.length - 1))
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">Vendor onboarding</div>
        <h1 className="text-xl font-semibold tracking-tight">Register a domain-specific model</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Declare your model&apos;s domain and specificity. Adjudica maps it into a reasoning rubric used to judge every future response.
        </p>

        {/* Stepper */}
        <ol className="mt-6 flex items-center gap-2">
          {steps.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  i < step
                    ? "border-primary bg-primary text-primary-foreground"
                    : i === step
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span className={cn("hidden text-xs sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>
                {s}
              </span>
              {i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Model name">
                <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. CardioScribe-3B" className="input" />
              </Field>
              <Field label="Domain">
                <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. Clinical Cardiology" className="input" />
              </Field>
              <Field label="Target audience / depth level">
                <div className="flex flex-wrap gap-2">
                  {audiences.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAudience(a)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs transition-colors",
                        audience === a ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <ComplianceNotice />
              <Field
                label="Specificity declaration"
                hint="Describe how your model reasons, the depth it targets, terminology, rules, and what a correct answer must contain."
              >
                <textarea value={spec} onChange={(e) => setSpec(e.target.value)} rows={9} placeholder="e.g. Answers target board-certified clinicians and must proceed through triage → diagnostics → intervention → contraindications → disposition, citing ESC/ACC-AHA standards…" className="input resize-y" />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <Upload className="size-4" />
                {fileName ? `Appended: ${fileName}` : "Upload a spec document (.txt, .md) to append"}
                <input type="file" accept=".txt,.md,.markdown,text/plain" onChange={onFile} className="hidden" />
              </label>

              <Field
                label="Reference evidence corpus (optional)"
                hint="Upload guidelines/standards the judge will actually retrieve against when grading responses in this domain — not just appended text."
              >
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {evidenceUploading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                  {evidenceUploading ? "Indexing…" : "Upload evidence documents (.txt, .md)"}
                  <input
                    type="file"
                    accept=".txt,.md,.markdown,text/plain"
                    multiple
                    onChange={onEvidenceFiles}
                    disabled={evidenceUploading || !domain.trim()}
                    className="hidden"
                  />
                </label>
                {evidenceDocs.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {evidenceDocs.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/30 px-2.5 py-1.5 text-xs">
                        <span className="flex items-center gap-1.5 truncate text-foreground/90">
                          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                          {d.title}
                          <span className="text-muted-foreground">· {d.chunkCount} chunks indexed</span>
                        </span>
                        <button onClick={() => removeEvidenceDoc(d.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {loading && (
                <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Deriving the reasoning map from your specification…
                </div>
              )}
              {error && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="size-4" /> Could not derive the map.
                  </span>
                  <button onClick={derive} className="rounded-md border border-destructive/30 px-2.5 py-1 text-xs">
                    Retry
                  </button>
                </div>
              )}
              {map && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                    <Workflow className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p className="leading-relaxed text-pretty">{map.domainSummary}</p>
                  </div>
                  <ol className="space-y-2">
                    {map.stages?.map((s, i) => (
                      <li key={i} className="rounded-lg border border-border p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                          <span className="text-sm font-medium">{s.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {s.expected?.map((e, j) => (
                            <span key={j} className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                              {e}
                            </span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-success/30 bg-success/10 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-success">
                  <Check className="size-4" /> Domain ready for evaluation
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {model} is registered in the {domain} domain with a {map?.stages?.length ?? 0}-stage reasoning rubric.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Summary label="Model" value={model} />
                <Summary label="Domain" value={domain} />
                <Summary label="Audience" value={audience} />
                <Summary label="Reasoning stages" value={String(map?.stages?.length ?? 0)} />
              </dl>
              <a
                href={registeredId ? `/evaluate?model=${registeredId}` : "/evaluate"}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Run first evaluation <ChevronRight className="size-4" />
              </a>
            </div>
          )}
        </div>

        {/* Nav */}
        {step < 3 && (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="size-4" /> Back
            </button>
            <button
              onClick={next}
              disabled={!canNext || (step === 2 && (loading || !map))}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {step === 1 ? "Derive reasoning map" : "Continue"} <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value || "—"}</dd>
    </div>
  )
}
