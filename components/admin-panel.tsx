"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, Trash2, Copy, Check, AlertTriangle, ShieldCheck } from "lucide-react"

interface MemberRow {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  isVerifiedReviewer: boolean
}

interface InviteRow {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
}

interface ApiKeyRow {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

function CopyBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-2.5 py-2 font-mono text-xs">
      <span className="flex-1 truncate">{value}</span>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}

export function TeamSection({ members, invites }: { members: MemberRow[]; invites: InviteRow[] }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"member" | "owner">("member")
  const [submitting, setSubmitting] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setInviteLink(null)
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      })
      if (res.ok) {
        const data = await res.json()
        setInviteLink(`${window.location.origin}/invite/${data.token}`)
        setEmail("")
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function revoke(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/invites/${id}`, { method: "DELETE" })
      if (res.ok) router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function toggleVerifiedReviewer(id: string, verified: boolean) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/members/${id}/verified-reviewer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified }),
      })
      if (res.ok) router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submitInvite} className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Invite teammate</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="input mt-1 h-9 w-64"
          />
        </label>
        <select value={role} onChange={(e) => setRole(e.target.value as "member" | "owner")} className="input h-9 w-32">
          <option value="member">Member</option>
          <option value="owner">Owner</option>
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Send invite
        </button>
      </form>

      {inviteLink && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            No email is sent — copy this link and share it with your teammate directly:
          </p>
          <CopyBox value={inviteLink} />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Members</h2>
          <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
            &quot;Verified reviewer&quot; is a claim you&apos;re vouching for as the org owner — Adjudica does not check
            medical licenses or other credentials. It only affects which calibration numbers count on{" "}
            <span className="font-mono">/quality</span>.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2 font-medium">Verified reviewer</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{m.email}</td>
                  <td className="px-4 py-2 text-muted-foreground">{m.name}</td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-secondary px-1.5 py-0.5">{m.role}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-muted-foreground">{m.createdAt.slice(0, 10)}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleVerifiedReviewer(m.id, !m.isVerifiedReviewer)}
                      disabled={busyId === m.id}
                      className={
                        m.isVerifiedReviewer
                          ? "inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2 py-1 text-success hover:bg-success/20 disabled:opacity-50"
                          : "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                      }
                    >
                      {busyId === m.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="size-3.5" />
                      )}
                      {m.isVerifiedReviewer ? "Verified" : "Mark verified"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {invites.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Pending invites</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Expires</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{i.email}</td>
                    <td className="px-4 py-2 text-muted-foreground">{i.role}</td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-muted-foreground">
                      {i.expiresAt.slice(0, 10)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => revoke(i.id)}
                        disabled={busyId === i.id}
                        className="inline-flex items-center gap-1.5 rounded-md border border-destructive/25 px-2 py-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {busyId === i.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export function ApiKeysSection({ apiKeys }: { apiKeys: ApiKeyRow[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [rawKey, setRawKey] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setRawKey(null)
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const data = await res.json()
        setRawKey(data.key)
        setName("")
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this API key? Any CI job using it will start failing immediately.")) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" })
      if (res.ok) router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-pretty">
        Use an API key to trigger evaluations from CI: <code className="rounded bg-secondary px-1 py-0.5">POST
        /api/evaluate</code> with <code className="rounded bg-secondary px-1 py-0.5">Authorization: Bearer &lt;key&gt;</code> returns
        a synchronous JSON result instead of streaming.
      </p>

      <form onSubmit={submitCreate} className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Key name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. GitHub Actions"
            className="input mt-1 h-9 w-64"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Create key
        </button>
      </form>

      {rawKey && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs text-warning">
            <AlertTriangle className="size-3.5" /> This is the only time this key is shown. Copy it now.
          </p>
          <CopyBox value={rawKey} />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Key</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Last used</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-muted-foreground">
                    No API keys yet.
                  </td>
                </tr>
              ) : (
                apiKeys.map((k) => (
                  <tr key={k.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{k.name}</td>
                    <td className="px-4 py-2 font-mono text-muted-foreground">{k.keyPrefix}…</td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-muted-foreground">
                      {k.createdAt.slice(0, 10)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-muted-foreground">
                      {k.lastUsedAt ? k.lastUsedAt.slice(0, 10) : "Never"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {k.revokedAt ? (
                        <span className="text-muted-foreground">Revoked</span>
                      ) : (
                        <button
                          onClick={() => revoke(k.id)}
                          disabled={busyId === k.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-destructive/25 px-2 py-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {busyId === k.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
