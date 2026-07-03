import type { EvaluationRunRow } from "@/lib/db/schema"

function csvEscape(value: string | number): string {
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(values: (string | number)[]): string {
  return values.map(csvEscape).join(",")
}

export function buildRunCsv(run: EvaluationRunRow): string {
  const lines: string[] = []

  lines.push(row(["Adjudica evaluation report"]))
  lines.push(row(["Run ID", run.id]))
  lines.push(row(["Model", run.model]))
  lines.push(row(["Domain", run.domain]))
  lines.push(row(["Created", run.createdAt.toISOString()]))
  lines.push(row(["Factuality", run.factuality]))
  lines.push(row(["Specificity", run.specificity]))
  lines.push(row(["Hallucination rate", run.hallucinationRate]))
  lines.push(row(["Judge confidence", run.confidence]))
  lines.push(row(["Summary", run.summary]))
  lines.push("")

  lines.push(row(["Claim", "Verdict", "Confidence", "Evidence Grounded", "Evidence", "Rationale"]))
  for (const claim of run.claims) {
    lines.push(
      row([claim.text, claim.verdict, claim.confidence, claim.evidenceGrounded ? "yes" : "no", claim.evidence, claim.rationale]),
    )
  }
  lines.push("")

  lines.push(row(["Stage", "Coverage", "Status", "Description"]))
  for (const stage of run.stages) {
    lines.push(row([stage.name, stage.coverage, stage.status, stage.description]))
  }
  lines.push("")

  lines.push(row(["Improvement", "Severity", "Category", "Detail", "Recommendation"]))
  for (const improvement of run.improvements) {
    lines.push(
      row([improvement.title, improvement.severity, improvement.category, improvement.detail, improvement.recommendation]),
    )
  }

  return lines.join("\n")
}
