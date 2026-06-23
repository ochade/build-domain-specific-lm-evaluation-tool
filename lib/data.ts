// Mock evaluation data for the Adjudica "Agent-as-Judge" platform.
// Scenario: a domain-specific SLM ("CardioScribe-3B") fine-tuned for clinical
// cardiology Q&A. The customer declared a domain specification; the judge agent
// derived a reasoning map and graded specificity + factuality claim-by-claim.

export type Verdict = "supported" | "hallucinated" | "unsupported" | "retrieval-gap"

export interface ScoreMetric {
  key: string
  label: string
  value: number // 0-100
  delta: number // vs previous run
  caption: string
}

export interface DomainStage {
  id: string
  name: string
  description: string
  coverage: number // 0-100, how well the model covered this reasoning step
  status: "strong" | "partial" | "weak"
  expected: string[]
}

export interface Claim {
  id: string
  text: string
  verdict: Verdict
  confidence: number // judge confidence 0-100
  stageId: string
  evidence: string
  rationale: string
}

export interface TranscriptSegment {
  text: string
  claimId?: string
}

export interface Improvement {
  id: string
  severity: "critical" | "major" | "minor"
  category: string
  title: string
  detail: string
  recommendation: string
}

export interface JudgeStep {
  id: string
  phase: string
  action: string
  detail: string
  tool?: string
}

export const evaluation = {
  model: "CardioScribe-3B",
  version: "v0.4.2",
  domain: "Clinical Cardiology",
  vendor: "Meridian Health AI",
  runId: "run_8f2c1a",
  startedAt: "2026-06-23 09:41 UTC",
  duration: "2m 18s",
  prompt:
    "A 58-year-old patient presents with central chest pain radiating to the left arm, diaphoresis, and an ECG showing 2mm ST elevation in leads II, III, and aVF. Outline the immediate management.",
  judgeModel: "Adjudica-Judge (agentic, 7-step)",
  humanAgreement: 0.91,
}

export const scores: ScoreMetric[] = [
  {
    key: "factuality",
    label: "Factuality",
    value: 82,
    delta: 4,
    caption: "Claims grounded in source evidence",
  },
  {
    key: "specificity",
    label: "Specificity",
    value: 68,
    delta: -3,
    caption: "Domain-appropriate depth & granularity",
  },
  {
    key: "hallucination",
    label: "Hallucination Rate",
    value: 12,
    delta: -5,
    caption: "Unsupported claims per response",
  },
  {
    key: "agreement",
    label: "Judge ↔ Expert",
    value: 91,
    delta: 2,
    caption: "Agreement with clinician labels",
  },
]

export const domainStages: DomainStage[] = [
  {
    id: "triage",
    name: "Recognition & Triage",
    description: "Identify the presenting syndrome and acuity.",
    coverage: 95,
    status: "strong",
    expected: ["Recognize STEMI pattern", "Establish time-critical acuity", "Inferior territory localization"],
  },
  {
    id: "diagnostics",
    name: "Diagnostic Workup",
    description: "Order and interpret confirmatory investigations.",
    coverage: 78,
    status: "partial",
    expected: ["12-lead ECG", "Cardiac troponin", "Right-sided leads (V4R)", "Bedside echo"],
  },
  {
    id: "intervention",
    name: "Acute Intervention",
    description: "Time-sensitive reperfusion and stabilization.",
    coverage: 84,
    status: "strong",
    expected: ["Aspirin loading", "P2Y12 inhibitor", "Primary PCI activation", "Anticoagulation"],
  },
  {
    id: "contraindications",
    name: "Risk & Contraindications",
    description: "Account for harm vectors specific to inferior MI.",
    coverage: 41,
    status: "weak",
    expected: ["Avoid nitrates if RV infarct", "Bleeding risk assessment", "Hypotension caution"],
  },
  {
    id: "disposition",
    name: "Disposition & Follow-up",
    description: "Downstream care pathway and monitoring.",
    coverage: 62,
    status: "partial",
    expected: ["CCU admission", "Door-to-balloon target", "Secondary prevention"],
  },
]

export const claims: Claim[] = [
  {
    id: "c1",
    text: "The ECG findings indicate an acute inferior ST-elevation myocardial infarction (STEMI).",
    verdict: "supported",
    confidence: 98,
    stageId: "triage",
    evidence: "ESC 2023 ACS Guidelines §3.2 — ST elevation in II, III, aVF localizes to the inferior wall.",
    rationale: "Claim entails directly from the lead pattern in the prompt and the cited guideline.",
  },
  {
    id: "c2",
    text: "Administer 300mg aspirin and a P2Y12 inhibitor as dual antiplatelet loading.",
    verdict: "supported",
    confidence: 94,
    stageId: "intervention",
    evidence: "ESC 2023 ACS Guidelines §6.1 — DAPT loading recommended at first medical contact.",
    rationale: "Dosing and indication match the retrieved guideline span.",
  },
  {
    id: "c3",
    text: "Give sublingual nitroglycerin to relieve ischemic chest pain.",
    verdict: "unsupported",
    confidence: 88,
    stageId: "contraindications",
    evidence: "No source supports routine nitrates here; inferior STEMI carries RV-infarct risk where nitrates can cause profound hypotension.",
    rationale: "Reasoning gap: model omitted the RV-infarct contraindication mapped in the domain spec.",
  },
  {
    id: "c4",
    text: "Activate the cath lab for primary PCI with a door-to-balloon target under 90 minutes.",
    verdict: "supported",
    confidence: 96,
    stageId: "intervention",
    evidence: "ACC/AHA performance standard — primary PCI within 90 min of first medical contact.",
    rationale: "Numerically and procedurally consistent with cited standard.",
  },
  {
    id: "c5",
    text: "Initiate IV thrombolysis with tenecteplase as the first-line reperfusion strategy.",
    verdict: "hallucinated",
    confidence: 91,
    stageId: "intervention",
    evidence: "Contradicts retrieved guideline: thrombolysis is second-line only when PCI is unavailable within 120 min.",
    rationale: "Direct contradiction with source — fabricated first-line preference. High-severity factual error.",
  },
  {
    id: "c6",
    text: "Obtain right-sided ECG leads (V4R) to assess for right ventricular involvement.",
    verdict: "supported",
    confidence: 90,
    stageId: "diagnostics",
    evidence: "ESC 2023 §3.3 — right-sided leads recommended in inferior STEMI.",
    rationale: "Appropriate diagnostic specificity for the inferior territory.",
  },
  {
    id: "c7",
    text: "Order a D-dimer to rule out the cardiac event.",
    verdict: "retrieval-gap",
    confidence: 73,
    stageId: "diagnostics",
    evidence: "No relevant evidence retrieved; D-dimer is not part of the STEMI pathway. Likely retrieval miss, not pure fabrication.",
    rationale: "Flagged as retrieval failure — the correct biomarker (troponin) was not surfaced to the model.",
  },
]

export const transcript: TranscriptSegment[] = [
  { text: "Immediate management: " },
  { text: "The ECG findings indicate an acute inferior ST-elevation myocardial infarction (STEMI). ", claimId: "c1" },
  { text: "Obtain right-sided ECG leads (V4R) to assess for right ventricular involvement. ", claimId: "c6" },
  { text: "Order a D-dimer to rule out the cardiac event. ", claimId: "c7" },
  { text: "Administer 300mg aspirin and a P2Y12 inhibitor as dual antiplatelet loading. ", claimId: "c2" },
  { text: "Give sublingual nitroglycerin to relieve ischemic chest pain. ", claimId: "c3" },
  { text: "Activate the cath lab for primary PCI with a door-to-balloon target under 90 minutes. ", claimId: "c4" },
  { text: "Initiate IV thrombolysis with tenecteplase as the first-line reperfusion strategy. ", claimId: "c5" },
  { text: "Admit to the coronary care unit for continuous monitoring." },
]

export const improvements: Improvement[] = [
  {
    id: "i1",
    severity: "critical",
    category: "Factuality",
    title: "Fabricated first-line reperfusion strategy",
    detail:
      "The model presented IV thrombolysis as first-line, contradicting the source guideline where primary PCI is preferred and thrombolysis is reserved for when PCI is unavailable within 120 minutes.",
    recommendation:
      "Add contrastive training pairs that anchor reperfusion ordering to PCI availability. Gate the claim behind a retrieved-evidence check before generation.",
  },
  {
    id: "i2",
    severity: "major",
    category: "Specificity",
    title: "Missing inferior-MI contraindication reasoning",
    detail:
      "Coverage of the 'Risk & Contraindications' reasoning stage was only 41%. The model recommended nitrates without screening for right-ventricular infarct, a domain-specific harm vector.",
    recommendation:
      "Inject the contraindication sub-graph from the declared domain spec into the system prompt and reward explicit RV-infarct screening.",
  },
  {
    id: "i3",
    severity: "major",
    category: "Retrieval",
    title: "Biomarker retrieval miss",
    detail:
      "A D-dimer order was emitted while cardiac troponin — the correct biomarker — was never retrieved. Classified as a retrieval failure rather than a generation hallucination.",
    recommendation:
      "Improve the cardiology corpus index for biomarker queries; this is an upstream retrieval fix, not a model fine-tune.",
  },
  {
    id: "i4",
    severity: "minor",
    category: "Specificity",
    title: "Shallow disposition pathway",
    detail:
      "Disposition stage coverage (62%) omitted secondary-prevention specifics expected at the declared depth level.",
    recommendation:
      "Expand target outputs to include statin, beta-blocker, and ACE-inhibitor secondary prevention where appropriate.",
  },
]

export const judgeTrace: JudgeStep[] = [
  {
    id: "j1",
    phase: "Plan",
    action: "Derive domain reasoning map",
    detail: "Parsed the vendor's declared specification into a 5-stage cardiology reasoning graph.",
    tool: "spec-to-graph",
  },
  {
    id: "j2",
    phase: "Decompose",
    action: "Atomize response into claims",
    detail: "Segmented the model output into 7 atomic, independently verifiable claims.",
    tool: "claim-extractor",
  },
  {
    id: "j3",
    phase: "Retrieve",
    action: "Gather domain evidence",
    detail: "Pulled supporting spans from ESC 2023 & ACC/AHA guideline corpus for each claim.",
    tool: "evidence-retriever",
  },
  {
    id: "j4",
    phase: "Verify",
    action: "Entailment check per claim",
    detail: "Ran NLI entailment of each claim against retrieved evidence; tagged contradictions.",
    tool: "nli-verifier",
  },
  {
    id: "j5",
    phase: "Classify",
    action: "Separate hallucination from retrieval gap",
    detail: "Distinguished fabricated claims from claims failing due to missing retrieval.",
    tool: "failure-router",
  },
  {
    id: "j6",
    phase: "Score",
    action: "Map coverage to domain stages",
    detail: "Aligned claims to reasoning stages and computed specificity coverage per stage.",
    tool: "coverage-mapper",
  },
  {
    id: "j7",
    phase: "Diagnose",
    action: "Synthesize improvement plan",
    detail: "Generated prioritized, root-cause-tagged recommendations for the vendor.",
    tool: "diagnostic-synth",
  },
]

export const trend = [
  { run: "v0.3.8", factuality: 71, specificity: 60 },
  { run: "v0.3.9", factuality: 74, specificity: 63 },
  { run: "v0.4.0", factuality: 76, specificity: 66 },
  { run: "v0.4.1", factuality: 78, specificity: 71 },
  { run: "v0.4.2", factuality: 82, specificity: 68 },
]

export const verdictMeta: Record<
  Verdict,
  { label: string; tone: "success" | "warning" | "destructive" | "muted" }
> = {
  supported: { label: "Supported", tone: "success" },
  hallucinated: { label: "Hallucinated", tone: "destructive" },
  unsupported: { label: "Unsupported", tone: "warning" },
  "retrieval-gap": { label: "Retrieval Gap", tone: "muted" },
}
