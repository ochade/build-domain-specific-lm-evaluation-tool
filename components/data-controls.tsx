"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { Download, Trash2, Loader2, FileText } from "lucide-react"

interface RunRow {
  id: string
  model: string
  domain: string
  createdAt: string
}

export function ExportButton() {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const res = await fetch("/api/data/export")
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "adjudica-export.json"
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      Export all organization data
    </button>
  )
}

export function RunsTable({ runs }: { runs: RunRow[] }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this evaluation run and its reviews? This cannot be undone.")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/data/runs/${id}`, { method: "DELETE" })
      if (res.ok) router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  if (runs.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No evaluation runs yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-4 py-2 font-medium">Time</th>
            <th className="px-4 py-2 font-medium">Model</th>
            <th className="px-4 py-2 font-medium">Domain</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="whitespace-nowrap px-4 py-2 font-mono text-muted-foreground">
                {r.createdAt.slice(0, 16).replace("T", " ")}
              </td>
              <td className="px-4 py-2">{r.model}</td>
              <td className="px-4 py-2 text-muted-foreground">{r.domain}</td>
              <td className="px-4 py-2 text-right">
                <div className="inline-flex items-center gap-1.5">
                  <Link
                    href={`/reports/${r.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
                  >
                    <FileText className="size-3.5" /> Report
                  </Link>
                  <a
                    href={`/api/reports/${r.id}/csv`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
                  >
                    <Download className="size-3.5" /> CSV
                  </a>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-destructive/25 px-2 py-1 text-destructive transition-opacity hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {deletingId === r.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
