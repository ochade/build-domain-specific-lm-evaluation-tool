"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Gavel, Loader2, AlertCircle } from "lucide-react"

const empty = { organizationName: "", name: "", email: "", password: "" }

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || "Could not create your account.")
      setLoading(false)
      return
    }

    const signInRes = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    })
    setLoading(false)
    if (signInRes?.error) {
      setError("Account created, but sign-in failed. Try signing in manually.")
      return
    }
    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link href="/welcome" className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Gavel className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Adjudica</span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-lg font-semibold tracking-tight">Register your organization</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Creates a new, isolated workspace for your vendor org — only your team will see your models and runs.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <Field label="Organization / vendor name">
              <input required value={form.organizationName} onChange={set("organizationName")} className="input" placeholder="e.g. Meridian Health AI" />
            </Field>
            <Field label="Your name">
              <input required value={form.name} onChange={set("name")} className="input" placeholder="e.g. Jordan Lee" />
            </Field>
            <Field label="Email">
              <input type="email" required value={form.email} onChange={set("email")} className="input" placeholder="you@company.com" />
            </Field>
            <Field label="Password" hint="At least 8 characters">
              <input type="password" required minLength={8} value={form.password} onChange={set("password")} className="input" placeholder="••••••••" />
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
              Create organization
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
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
