"use client"

import { useObject } from "@ai-sdk/react"
import { useState } from "react"
import { Loader2, Play, Sparkles, AlertCircle } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { LiveResults } from "@/components/live-results"
import { evaluationResultSchema } from "@/lib/eval-schema"

const sample = {
  domain: "Clinical Cardiology",
  spec: `Answers target board-certified emergency clinicians. Reasoning must proceed: (1) recognition & triage of the presenting syndrome, (2) diagnostic workup with the correct biomarkers and lead placement, (3) acute reperfusion/intervention ordered by guideline preference, (4) domain-specific contraindications and harm vectors, (5) disposition and secondary prevention. Cite ESC/ACC-AHA standards. Never present second-line therapy as first-line.`,
  prompt:
    "A 58-year-old presents with central chest pain radiating to the left arm, diaphoresis, and an ECG showing 2mm ST elevation in leads II, III, and aVF. Outline the immediate management.",
  response: `This is an acute inferior STEMI. Obtain right-sided leads (V4R) to assess RV involvement. Order a D-dimer to rule out the event. Give 300mg aspirin plus a P2Y12 inhibitor. Administer sublingual nitroglycerin for pain. Start IV thrombolysis with tenecteplase as the first-line reperfusion strategy. Activate the cath lab targeting door-to-balloon under 90 minutes. Admit to CCU.`,
  sources: "",
}

const empty = { domain: "", spec: "", prompt: "", response: "", sources: "" }

export default function EvaluatePage() {
  const [form, setForm] = useState(empty)
  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/evaluate",
    schema: evaluationResultSchema,
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

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
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Evaluation input</span>
              <button
                onClick={() => setForm(sample)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Sparkles className="size-3.5" />
                Load cardiology sample
              </button>
            </div>

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
            <Field label="Reference sources" hint="Optional evidence corpus to ground claims against">
              <textarea value={form.sources} onChange={set("sources")} rows={3} placeholder="Optional: paste authoritative source text…" className="input resize-y" />
            </Field>

            <div className="flex items-center gap-2">
              <button
                onClick={() => submit({ ...form })}
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
                <AlertCircle className="size-4" />
                Evaluation failed. Check that the AI Gateway is configured, then try again.
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
