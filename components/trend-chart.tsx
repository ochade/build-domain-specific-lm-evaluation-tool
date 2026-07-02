export interface TrendPoint {
  run: string
  factuality: number
  specificity: number
}

function path(values: number[], w: number, h: number) {
  const max = 100
  const min = 50
  const step = w / (values.length - 1)
  return values
    .map((v, i) => {
      const x = i * step
      const y = h - ((v - min) / (max - min)) * h
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
}

export function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const w = 280
  const h = 80
  const fact = trend.map((t) => t.factuality)
  const spec = trend.map((t) => t.specificity)

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Score Trajectory</h2>
          <p className="text-xs text-muted-foreground">Across model versions</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full bg-primary" /> Factuality
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full bg-chart-4" /> Specificity
          </span>
        </div>
      </div>

      {trend.length < 2 ? (
        <p className="mt-4 text-xs text-muted-foreground">Run a few more evaluations to see a trend.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 w-full" preserveAspectRatio="none" role="img" aria-label="Score trajectory chart">
            <path d={path(fact, w, h)} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
            <path d={path(spec, w, h)} fill="none" stroke="var(--chart-4)" strokeWidth="2" strokeLinecap="round" />
          </svg>

          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
            {trend.map((t, i) => (
              <span key={`${t.run}-${i}`}>{t.run}</span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
