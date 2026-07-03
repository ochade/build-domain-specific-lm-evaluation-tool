"use client"

import { experimental_useObject as useObject } from "@ai-sdk/react"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Play, Sparkles, AlertCircle } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { ComplianceNotice } from "@/components/compliance-notice"
import { LiveResults } from "@/components/live-results"
import { verifyResultSchema } from "@/lib/eval-schema"

const sample = {
  model: "CardioScribe-3B",
  domain: "Clinical Cardiology",
  spec: `Answers target board-certified emergency clinicians. Reasoning must proceed: (1) recognition & triage of the presenting syndrome, (2) diagnostic workup with the correct biomarkers and lead placement, (3) acute reperfusion/intervention ordered by guideline preference, (4) domain-specific contraindications and harm vectors, (5) disposition and secondary prevention. Cite ESC/ACC-AHA standards. Never present second-line therapy as first-line.`,
  prompt:
    "A 58-year-old presents with central chest pain radiating to the left arm, diaphoresis, and an ECG showing 2mm ST elevation in leads II, III, and aVF. Outline the immediate management.",
  response: `This is an acute inferior STEMI. Obtain right-sided leads (V4R) to assess RV involvement. Order a D-dimer to rule out the event. Give 300mg aspirin plus a P2Y12 inhibitor. Administer sublingual nitroglycerin for pain. Start IV thrombolysis with tenecteplase as the first-line reperfusion strategy. Activate the cath lab targeting door-to-balloon under 90 minutes. Admit to CCU.`,
  sources: "",
}

const empty = { model: "", domain: "", spec: "", prompt: "", response: "", sources: "" }

interface RegisteredModelSummary {
  id: string
  model: string
  domain: string
  spec: string
}

// useObject throws `new Error(await response.text())` for any non-2xx
// response, so the raw JSON body our routes return ({ error, details? })
// is sitting in `error.message` as a string. Parse it back out so we can
// show the server's actual message instead of one generic string.
function describeEvaluateError(error: Error): string {
  try {
    const body = JSON.parse(error.message) as { error?: string; details?: { message?: string }[] }
    if (body?.error === "Unauthorized") {
      return "Your session has expired. Please sign in again."
    }
    if (body?.error?.startsWith("Rate limit reached")) {
      return body.error
    }
    if (body?.error === "Invalid request body." && body.details?.length) {
      return `Check your input: ${body.details.map((d) => d.message).join("; ")}`
    }
    if (body?.error) {
      return body.error
    }
  } catch {
    // error.message wasn't JSON — likely a stream-level failure after the
    // response had already started (e.g. the model/provider failed mid-call).
  }
  return "The judge encountered an error while evaluating — this may be a temporary model/provider issue. Please try again."
}

export default function EvaluatePageWrapper() {
  return (
    <Suspense fallback={null}>
      <EvaluatePage />
    </Suspense>
  )
}

function EvaluatePage() {
  const searchParams = useSearchParams()
  const [form, setForm] = useState(empty)
  const [registeredModels, setRegisteredModels] = useState<RegisteredModelSummary[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/evaluate",
    schema: verifyResultSchema,
  })

  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((models: RegisteredModelSummary[]) => setRegisteredModels(models))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const modelId = searchParams.get("model")
    if (!modelId) return
    fetch(`/api/models/${modelId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((m: RegisteredModelSummary | null) => {
        if (!m) return
        setSelectedModelId(m.id)
        setForm((f) => ({ ...f, model: m.model, domain: m.domain, spec: m.spec }))
      })
      .catch(() => {})
  }, [searchParams])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  function selectRegisteredModel(id: string) {
    setSelectedModelId(id)
    if (!id) return
    const m = registeredModels.find((r) => r.id === id)
    if (m) setForm((f) => ({ ...f, model: m.model, domain: m.domain, spec: m.spec }))
  }

  const canRun = form.prompt.trim() && form.response.trim() && !isLoading

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">New Evaluation</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Submit a prompt and your model&apos;s response. The agentic judge decomposes the answer into atomic claims,
            verifies each against domain evidence, separates hallucinations from retrieval gaps, and scores specificity.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Input */}
          <div className="space-y-4 lg:col-span-5">
            <ComplianceNotice />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Evaluation input</span>
              <button
                onClick={() => {
                  setSelectedModelId("")
                  setForm(sample)
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Sparkles className="size-3.5" />
                Load cardiology sample
              </button>
            </div>

            <Field label="Registered model" hint="Optional — prefills domain & spec from onboarding">
              <select
                value={selectedModelId}
                onChange={(e) => selectRegisteredModel(e.target.value)}
                className="input"
              >
                <option value="">— Ad-hoc (not registered) —</option>
                {registeredModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.model} ({m.domain})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Model name" hint="Which model produced this response?">
              <input
                value={form.model}
                onChange={set("model")}
                placeholder="e.g. CardioScribe-3B"
                className="input"
              />
            </Field>
            <Field label="Domain">
              <input
                value={form.domain}
                onChange={set("domain")}
                placeholder="e.g. Clinical Cardiology"
                className="input"
              />
            </Field>
            <Field label="Domain specification / expected reasoning" hint="What depth and structure should answers have?">
              <textarea value={form.spec} onChange={set("spec")} rows={4} placeholder="Declare the reasoning stages, depth, and rules…" className="input resize-y" />
            </Field>
            <Field label="Prompt" hint="The question given to the model">
              <textarea value={form.prompt} onChange={set("prompt")} rows={3} placeholder="The prompt…" className="input resize-y" />
            </Field>
            <Field label="Model response" hint="The output to judge">
              <textarea value={form.response} onChange={set("response")} rows={6} placeholder="Paste the model's response…" className="input resize-y" />
            </Field>
            <Field
              label="Additional context (optional, not authoritative)"
              hint="Authoritative evidence is retrieved automatically from documents ingested for this domain during onboarding. This is just supplementary, unverified text."
            >
              <textarea value={form.sources} onChange={set("sources")} rows={3} placeholder="Optional: extra context the judge should be aware of…" className="input resize-y" />
            </Field>

            <div className="flex items-center gap-2">
              <button
                onClick={() => submit({ ...form, registeredModelId: selectedModelId || null })}
                disabled={!canRun}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                {isLoading ? "Judging…" : "Run evaluation"}
              </button>
              {isLoading && (
                <button onClick={() => stop()} className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Output */}
          <div className="lg:col-span-7">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {describeEvaluateError(error)}
              </div>
            )}
            {!object && !isLoading && !error && (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
                <Sparkles className="size-6 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Results will stream in here as the judge works.</p>
              </div>
            )}
            <LiveResults result={object as never} />
          </div>
        </div>
      </main>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted-foreground">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}
