"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Pencil, Trash2, Loader2, Check, X } from "lucide-react"

interface ModelRow {
  id: string
  model: string
  domain: string
  audience: string
  createdAt: string
}

export function ModelsTable({ models }: { models: ModelRow[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editModel, setEditModel] = useState("")
  const [editDomain, setEditDomain] = useState("")

  function startEdit(row: ModelRow) {
    setEditingId(row.id)
    setEditModel(row.model)
    setEditDomain(row.domain)
  }

  async function saveEdit(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: editModel, domain: editDomain }),
      })
      if (res.ok) {
        setEditingId(null)
        router.refresh()
      }
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this registered model? Past evaluation runs will be kept but unlinked.")) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/models/${id}`, { method: "DELETE" })
      if (res.ok) router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  if (models.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No registered models yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-4 py-2 font-medium">Model</th>
            <th className="px-4 py-2 font-medium">Domain</th>
            <th className="px-4 py-2 font-medium">Audience</th>
            <th className="px-4 py-2 font-medium">Registered</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id} className="border-b border-border last:border-0">
              {editingId === m.id ? (
                <>
                  <td className="px-4 py-2">
                    <input
                      value={editModel}
                      onChange={(e) => setEditModel(e.target.value)}
                      className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={editDomain}
                      onChange={(e) => setEditDomain(e.target.value)}
                      className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{m.audience}</td>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-muted-foreground">
                    {m.createdAt.slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => saveEdit(m.id)}
                        disabled={busyId === m.id}
                        className="inline-flex items-center gap-1 rounded-md border border-success/30 px-2 py-1 text-success hover:bg-success/10 disabled:opacity-50"
                      >
                        {busyId === m.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2">{m.model}</td>
                  <td className="px-4 py-2 text-muted-foreground">{m.domain}</td>
                  <td className="px-4 py-2 text-muted-foreground">{m.audience}</td>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-muted-foreground">
                    {m.createdAt.slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => startEdit(m)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-3.5" /> Rename
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={busyId === m.id}
                        className="inline-flex items-center gap-1.5 rounded-md border border-destructive/25 px-2 py-1 text-destructive transition-opacity hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {busyId === m.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                        Delete
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
