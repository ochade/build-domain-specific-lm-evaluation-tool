import { ShieldAlert } from "lucide-react"

export function ComplianceNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground/90">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
      <p className="text-pretty leading-relaxed">
        <span className="font-medium">Do not submit real patient-identifiable information or other real personal
        data.</span> Adjudica evaluates AI-generated text for factuality and specificity — it does not provide
        medical advice and is not a substitute for professional clinical judgment. Sample/demo content is for
        illustration only.
      </p>
    </div>
  )
}
