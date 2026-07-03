"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { Gavel, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

const empty = { name: "", password: "" }

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...form }),
    })

    setLoading(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || "Could not accept this invite.")
      return
    }
    setDone(true)
    setTimeout(() => router.push("/login"), 1500)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Gavel className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Adjudica</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-lg font-semibold tracking-tight">Join your team on Adjudica</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set your name and password to accept this invite.</p>

          {done ? (
            <div className="mt-5 flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              <CheckCircle2 className="size-4 shrink-0" />
              Account created — redirecting to sign in…
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <Field label="Your name">
                <input required value={form.name} onChange={set("name")} className="input" placeholder="e.g. Jordan Lee" />
              </Field>
              <Field label="Password" hint="At least 8 characters">
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={set("password")}
                  className="input"
                  placeholder="••••••••"
                />
              </Field>

              {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                Accept invite
              </button>
            </form>
          )}
        </div>
      </div>
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
