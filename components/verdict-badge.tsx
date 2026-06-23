import { cn } from "@/lib/utils"
import type { Verdict } from "@/lib/data"
import { verdictMeta } from "@/lib/data"

const toneClasses: Record<string, string> = {
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/12 text-warning border-warning/25",
  destructive: "bg-destructive/12 text-destructive border-destructive/25",
  muted: "bg-muted text-muted-foreground border-border",
}

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const meta = verdictMeta[verdict]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        toneClasses[meta.tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {meta.label}
    </span>
  )
}
