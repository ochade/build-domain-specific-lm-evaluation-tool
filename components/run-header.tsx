import Link from "next/link"
import type { EvaluationRunRow } from "@/lib/db/schema"
import { Stethoscope, Clock, ShieldCheck, RefreshCw, GitCompare } from "lucide-react"

function formatDuration(ms: number) {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

function formatTimestamp(date: Date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`
}

export function RunHeader({ run }: { run: EvaluationRunRow }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Evaluations</span>
          <span aria-hidden>/</span>
          <span className="text-foreground">{run.id.slice(0, 8)}</span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-success/25 bg-success/12 px-2 py-0.5 font-medium text-success">
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            Completed
          </span>
        </div>
        <h1 className="text-pretty text-2xl font-semibold tracking-tight">
          {run.model}{" "}
          <span className="font-normal text-muted-foreground">· {run.domain} judge run</span>
        </h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Stethoscope className="size-3.5" /> {run.domain}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Adjudica-Judge (gpt-5-mini)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" /> {formatDuration(run.durationMs)} · {formatTimestamp(run.createdAt)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/compare"
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <GitCompare className="size-4" /> Compare runs
        </Link>
        <Link
          href="/evaluate"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="size-4" /> Run live judge
        </Link>
      </div>
    </div>
  )
}
