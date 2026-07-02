import { config } from "dotenv"
import type { Claim, DomainStage, Improvement, TranscriptSegment } from "@/lib/data"

config({ path: ".env.local" })
config()

const domain = "Clinical Cardiology"
const spec = `Answers target board-certified emergency clinicians. Reasoning must proceed: (1) recognition & triage of the presenting syndrome, (2) diagnostic workup with the correct biomarkers and lead placement, (3) acute reperfusion/intervention ordered by guideline preference, (4) domain-specific contraindications and harm vectors, (5) disposition and secondary prevention. Cite ESC/ACC-AHA standards. Never present second-line therapy as first-line.`
const prompt =
  "A 58-year-old patient presents with central chest pain radiating to the left arm, diaphoresis, and an ECG showing 2mm ST elevation in leads II, III, and aVF. Outline the immediate management."

const stageDefs = [
  { id: "triage", name: "Recognition & Triage", description: "Identify the presenting syndrome and acuity.", expected: ["Recognize STEMI pattern", "Establish time-critical acuity", "Inferior territory localization"] },
  { id: "diagnostics", name: "Diagnostic Workup", description: "Order and interpret confirmatory investigations.", expected: ["12-lead ECG", "Cardiac troponin", "Right-sided leads (V4R)", "Bedside echo"] },
  { id: "intervention", name: "Acute Intervention", description: "Time-sensitive reperfusion and stabilization.", expected: ["Aspirin loading", "P2Y12 inhibitor", "Primary PCI activation", "Anticoagulation"] },
  { id: "contraindications", name: "Risk & Contraindications", description: "Account for harm vectors specific to inferior MI.", expected: ["Avoid nitrates if RV infarct", "Bleeding risk assessment", "Hypotension caution"] },
  { id: "disposition", name: "Disposition & Follow-up", description: "Downstream care pathway and monitoring.", expected: ["CCU admission", "Door-to-balloon target", "Secondary prevention"] },
]

// Seeded claims predate real retrieval; mark supported/hallucinated ones as
// grounded to reflect that they cite a (mock) source, matching real runs'
// mechanically-computed semantics.
function withGrounding(claims: Omit<Claim, "evidenceGrounded">[]): Claim[] {
  return claims.map((c) => ({ ...c, evidenceGrounded: c.verdict === "supported" || c.verdict === "hallucinated" }))
}

function stagesFor(coverage: Record<string, number>): DomainStage[] {
  return stageDefs.map((s) => {
    const c = coverage[s.id]
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      coverage: c,
      status: c >= 80 ? "strong" : c >= 50 ? "partial" : "weak",
      expected: s.expected,
    }
  })
}

const run1Stages = stagesFor({ triage: 92, diagnostics: 70, intervention: 75, contraindications: 30, disposition: 55 })
const run2Stages = stagesFor({ triage: 94, diagnostics: 74, intervention: 80, contraindications: 36, disposition: 60 })
const run3Stages = stagesFor({ triage: 95, diagnostics: 78, intervention: 84, contraindications: 41, disposition: 62 })

const run1Claims: Omit<Claim, "evidenceGrounded">[] = [
  { id: "r1-c1", text: "Recognizes ST elevation in II, III, aVF as an acute inferior STEMI.", verdict: "supported", confidence: 96, stageId: "triage", evidence: "ESC 2023 ACS Guidelines §3.2 — inferior lead ST elevation pattern.", rationale: "Correctly localizes the infarct territory from the ECG." },
  { id: "r1-c2", text: "Orders a 12-lead ECG and cardiac troponin.", verdict: "supported", confidence: 90, stageId: "diagnostics", evidence: "Standard confirmatory workup for suspected ACS.", rationale: "Matches guideline-recommended initial investigations." },
  { id: "r1-c3", text: "Loads 300mg aspirin and a P2Y12 inhibitor.", verdict: "supported", confidence: 93, stageId: "intervention", evidence: "ESC 2023 §6.1 — DAPT loading at first medical contact.", rationale: "Dosing and indication match guideline." },
  { id: "r1-c4", text: "Activates the cath lab for primary PCI.", verdict: "supported", confidence: 91, stageId: "intervention", evidence: "ACC/AHA performance standard — primary PCI preferred reperfusion.", rationale: "Correct reperfusion strategy selection." },
  { id: "r1-c5", text: "States thrombolysis is preferred over PCI in all inferior STEMI cases.", verdict: "hallucinated", confidence: 87, stageId: "intervention", evidence: "Contradicts guideline: PCI is preferred when available within 120 minutes.", rationale: "Direct contradiction of reperfusion-preference ordering." },
  { id: "r1-c6", text: "Recommends routine sublingual nitroglycerin without screening for RV infarct.", verdict: "hallucinated", confidence: 84, stageId: "contraindications", evidence: "Nitrates risk profound hypotension in RV-infarct-associated inferior MI.", rationale: "Omits a known, severe contraindication." },
  { id: "r1-c7", text: "Suggests discharge within 24 hours without risk stratification.", verdict: "unsupported", confidence: 79, stageId: "disposition", evidence: "No evidence supports early discharge without stratification for STEMI.", rationale: "Plausible-sounding but unsupported disposition claim." },
  { id: "r1-c8", text: "Orders a chest X-ray to confirm the diagnosis.", verdict: "retrieval-gap", confidence: 68, stageId: "diagnostics", evidence: "Not part of the STEMI diagnostic pathway; correct biomarker (troponin) already ordered separately.", rationale: "Likely retrieval noise rather than fabrication." },
]

const run2Claims: Omit<Claim, "evidenceGrounded">[] = [
  { id: "r2-c1", text: "Identifies an acute inferior STEMI from the ECG pattern.", verdict: "supported", confidence: 97, stageId: "triage", evidence: "ESC 2023 ACS Guidelines §3.2.", rationale: "Correct syndrome recognition." },
  { id: "r2-c2", text: "Orders right-sided ECG leads (V4R) to assess RV involvement.", verdict: "supported", confidence: 90, stageId: "diagnostics", evidence: "ESC 2023 §3.3 — right-sided leads recommended in inferior STEMI.", rationale: "Appropriate diagnostic specificity." },
  { id: "r2-c3", text: "Loads dual antiplatelet therapy (aspirin + P2Y12 inhibitor).", verdict: "supported", confidence: 94, stageId: "intervention", evidence: "ESC 2023 §6.1.", rationale: "Matches guideline dosing and indication." },
  { id: "r2-c4", text: "Activates the cath lab within a 90-minute door-to-balloon target.", verdict: "supported", confidence: 95, stageId: "intervention", evidence: "ACC/AHA performance standard.", rationale: "Numerically consistent with cited standard." },
  { id: "r2-c5", text: "Admits to the CCU with continuous monitoring.", verdict: "supported", confidence: 88, stageId: "disposition", evidence: "Standard post-reperfusion disposition.", rationale: "Appropriate downstream care pathway." },
  { id: "r2-c6", text: "Suggests thrombolysis as an equally valid first-line option alongside PCI.", verdict: "hallucinated", confidence: 82, stageId: "intervention", evidence: "Contradicts guideline reperfusion-preference ordering.", rationale: "Understates PCI preference." },
  { id: "r2-c7", text: "Administers nitroglycerin without explicit RV-infarct screening.", verdict: "unsupported", confidence: 74, stageId: "contraindications", evidence: "No screening step documented before a risky intervention.", rationale: "Risky omission, not a direct contradiction." },
  { id: "r2-c8", text: "Orders a D-dimer instead of troponin.", verdict: "retrieval-gap", confidence: 70, stageId: "diagnostics", evidence: "Correct biomarker (troponin) not surfaced.", rationale: "Retrieval failure, not fabrication." },
]

const run3Claims: Omit<Claim, "evidenceGrounded">[] = [
  { id: "c1", text: "The ECG findings indicate an acute inferior ST-elevation myocardial infarction (STEMI).", verdict: "supported", confidence: 98, stageId: "triage", evidence: "ESC 2023 ACS Guidelines §3.2 — ST elevation in II, III, aVF localizes to the inferior wall.", rationale: "Claim entails directly from the lead pattern in the prompt and the cited guideline." },
  { id: "c2", text: "Administer 300mg aspirin and a P2Y12 inhibitor as dual antiplatelet loading.", verdict: "supported", confidence: 94, stageId: "intervention", evidence: "ESC 2023 ACS Guidelines §6.1 — DAPT loading recommended at first medical contact.", rationale: "Dosing and indication match the retrieved guideline span." },
  { id: "c3", text: "Give sublingual nitroglycerin to relieve ischemic chest pain.", verdict: "unsupported", confidence: 88, stageId: "contraindications", evidence: "No source supports routine nitrates here; inferior STEMI carries RV-infarct risk where nitrates can cause profound hypotension.", rationale: "Reasoning gap: model omitted the RV-infarct contraindication mapped in the domain spec." },
  { id: "c4", text: "Activate the cath lab for primary PCI with a door-to-balloon target under 90 minutes.", verdict: "supported", confidence: 96, stageId: "intervention", evidence: "ACC/AHA performance standard — primary PCI within 90 min of first medical contact.", rationale: "Numerically and procedurally consistent with cited standard." },
  { id: "c5", text: "Initiate IV thrombolysis with tenecteplase as the first-line reperfusion strategy.", verdict: "hallucinated", confidence: 91, stageId: "intervention", evidence: "Contradicts retrieved guideline: thrombolysis is second-line only when PCI is unavailable within 120 min.", rationale: "Direct contradiction with source — fabricated first-line preference. High-severity factual error." },
  { id: "c6", text: "Obtain right-sided ECG leads (V4R) to assess for right ventricular involvement.", verdict: "supported", confidence: 90, stageId: "diagnostics", evidence: "ESC 2023 §3.3 — right-sided leads recommended in inferior STEMI.", rationale: "Appropriate diagnostic specificity for the inferior territory." },
  { id: "c7", text: "Order a D-dimer to rule out the cardiac event.", verdict: "retrieval-gap", confidence: 73, stageId: "diagnostics", evidence: "No relevant evidence retrieved; D-dimer is not part of the STEMI pathway. Likely retrieval miss, not pure fabrication.", rationale: "Flagged as retrieval failure — the correct biomarker (troponin) was not surfaced to the model." },
]

const run3Transcript: TranscriptSegment[] = [
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

const run3Response = `Immediate management: This is an acute inferior STEMI. Obtain right-sided leads (V4R) to assess RV involvement. Order a D-dimer to rule out the event. Give 300mg aspirin plus a P2Y12 inhibitor. Administer sublingual nitroglycerin for pain. Start IV thrombolysis with tenecteplase as the first-line reperfusion strategy. Activate the cath lab targeting door-to-balloon under 90 minutes. Admit to CCU.`

function improvementsFor(id: string): Improvement[] {
  return [
    {
      id: `${id}-i1`,
      severity: "critical",
      category: "Factuality",
      title: "Fabricated or overstated reperfusion preference",
      detail: "The model misrepresents thrombolysis vs. primary PCI ordering, contradicting the source guideline's preference for PCI when available within the time window.",
      recommendation: "Add contrastive training pairs that anchor reperfusion ordering to PCI availability. Gate the claim behind a retrieved-evidence check before generation.",
    },
    {
      id: `${id}-i2`,
      severity: "major",
      category: "Specificity",
      title: "Missing inferior-MI contraindication reasoning",
      detail: "Coverage of the 'Risk & Contraindications' reasoning stage remains the weakest stage across runs. Nitrate administration is recommended without RV-infarct screening.",
      recommendation: "Inject the contraindication sub-graph from the declared domain spec into the system prompt and reward explicit RV-infarct screening.",
    },
    {
      id: `${id}-i3`,
      severity: "major",
      category: "Retrieval",
      title: "Biomarker retrieval miss",
      detail: "An incorrect biomarker order is emitted while cardiac troponin — the correct biomarker — is never retrieved. Classified as a retrieval failure rather than a generation hallucination.",
      recommendation: "Improve the cardiology corpus index for biomarker queries; this is an upstream retrieval fix, not a model fine-tune.",
    },
  ]
}

async function seed() {
  const { db } = await import("@/lib/db")
  const { evaluationRuns, organizations, users } = await import("@/lib/db/schema")
  const bcrypt = (await import("bcryptjs")).default

  const demoPassword = crypto.randomUUID().slice(0, 12)
  const passwordHash = await bcrypt.hash(demoPassword, 12)

  const [org] = await db.insert(organizations).values({ name: "Meridian Health AI" }).returning()
  await db.insert(users).values({
    organizationId: org.id,
    email: "demo@adjudica.dev",
    name: "Demo User",
    passwordHash,
  })

  await db.insert(evaluationRuns).values([
    {
      organizationId: org.id,
      model: "CardioScribe-3B v0.4.0",
      domain,
      spec,
      prompt,
      response: "Earlier model version response (v0.4.0) — see claim-level detail for the reasoning trace.",
      sources: null,
      summary: "Correct triage and reperfusion activation, but weak contraindication screening and a fabricated reperfusion-preference claim.",
      factuality: 76,
      specificity: 66,
      hallucinationRate: 21,
      confidence: 86,
      durationMs: 132000,
      claims: withGrounding(run1Claims),
      stages: run1Stages,
      improvements: improvementsFor("r1"),
      transcript: null,
      retrievedEvidence: null,
      createdAt: new Date("2026-06-09T09:00:00Z"),
    },
    {
      organizationId: org.id,
      model: "CardioScribe-3B v0.4.1",
      domain,
      spec,
      prompt,
      response: "Earlier model version response (v0.4.1) — see claim-level detail for the reasoning trace.",
      sources: null,
      summary: "Improved diagnostic and disposition coverage; contraindication screening and reperfusion-preference framing still need work.",
      factuality: 78,
      specificity: 71,
      hallucinationRate: 17,
      confidence: 89,
      durationMs: 128000,
      claims: withGrounding(run2Claims),
      stages: run2Stages,
      improvements: improvementsFor("r2"),
      transcript: null,
      retrievedEvidence: null,
      createdAt: new Date("2026-06-16T09:00:00Z"),
    },
    {
      organizationId: org.id,
      model: "CardioScribe-3B v0.4.2",
      domain,
      spec,
      prompt,
      response: run3Response,
      sources: null,
      summary: "Strong triage and intervention reasoning with one high-severity fabricated reperfusion claim and a weak contraindications stage.",
      factuality: 82,
      specificity: 68,
      hallucinationRate: 12,
      confidence: 91,
      durationMs: 138000,
      claims: withGrounding(run3Claims),
      stages: run3Stages,
      improvements: improvementsFor("r3"),
      transcript: run3Transcript,
      retrievedEvidence: null,
      createdAt: new Date("2026-06-23T09:41:00Z"),
    },
  ])

  console.log("Seeded 3 evaluation runs.")
  console.log("")
  console.log("Demo login:")
  console.log("  email:    demo@adjudica.dev")
  console.log(`  password: ${demoPassword}`)
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
