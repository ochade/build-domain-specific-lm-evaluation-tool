# Adjudica — Product Document

## 1. Problem & opportunity

Generic LLM evaluation checks fluency, not correctness. The dominant pattern — one model reading another model's
answer and judging whether it "sounds right" — works reasonably well for tone, coherence, and instruction-following.
It does nothing to catch a domain-specific model that is confidently, fluently wrong: a clinical model that
recommends the wrong reperfusion strategy, a legal assistant that cites a case that says the opposite of what it
claims, a financial model that states a regulatory figure that isn't in any filing it was given.

The cost of that failure mode scales with how high-stakes the domain is. A chatbot that's mildly wrong about
movie trivia is a minor annoyance. A domain-specific model that's confidently wrong in clinical, legal, or
financial contexts is a real liability — and nothing about "ask an LLM if this sounds correct" catches it, because
the judge never checks the claim against an actual source.

Adjudica exists to close that gap: verify each claim a model makes against real, retrieved evidence from the
vendor's own reference documents, rather than trusting either the model under test or a second model's unverified
opinion of it.

## 2. Target users

Adjudica is built for teams shipping a domain-specific LLM who need to know whether it's actually correct before
it reaches a user — not just whether it reads well.

Within a customer organization, there are three distinct roles the product serves:

- **The org owner** — registers models/domains, invites teammates, manages API keys, and is the only one who can
  mark a teammate as a verified reviewer. Typically the person accountable for the model's quality.
- **The reviewer** — a team member (clinician, legal reviewer, analyst, or just an engineer) who confirms or
  overrides the judge's verdict on individual claims, producing the calibration data that measures whether the
  judge itself can be trusted.
- **CI/automation** — a build pipeline that calls `/api/evaluate` with an API key on every model version push and
  gets back a synchronous, scriptable result (`runId`, factuality, hallucination rate) to gate a deploy on.

The flagship illustrative domain throughout the product is clinical cardiology, chosen because it's a legible,
high-stakes example that makes the failure mode concrete. The product itself is domain-agnostic — any domain with
a defined specification and a corpus of reference documents to check claims against.

## 3. What it does

This section describes what is actually built and running, not aspirational scope.

- **Domain onboarding** — a vendor declares a model, domain, target audience, and a specification of expected
  reasoning; Adjudica derives a structured domain reasoning map (stages, expected outputs per stage) from that
  spec via an LLM call, and the vendor can ingest reference documents that get chunked and embedded for retrieval.
- **The judge pipeline** — a real multi-step process, not one prompt doing everything:
  1. **Decompose** — one model call splits a response into atomic, independently verifiable claims and assigns
     each a reasoning stage.
  2. **Retrieve** — a real vector similarity search runs once *per claim* against the domain's ingested reference
     documents (not once for the whole response), with globally unique evidence tags across the run.
  3. **Verify** — a second model call classifies each claim (supported / hallucinated / unsupported /
     retrieval-gap) against only the evidence retrieved for that specific claim, citing it explicitly, and
     diagnoses prioritized, root-cause-tagged improvements.
  4. **Score** — factuality, hallucination rate, and overall confidence are computed deterministically from the
     verdicts above (not self-reported by the model being judged); only specificity remains an LLM judgment call,
     since it has no verdict-derivable signal.
- **Human calibration** — any user can confirm or override a claim's verdict; `/quality` computes a real,
  measured agreement rate between the judge and human reviewers from that data, segmentable by whether the
  reviewer has been marked a "verified reviewer" by the org owner.
- **Multi-tenancy & access control** — Auth.js-based sessions, strict per-organization data isolation on every
  query, owner/member roles, team invites (link-based, no email sending), and API keys for CI-triggered
  evaluations (hashed at rest, shown once at creation).
- **Observability & governance** — every LLM call (model, tokens, cost estimate, latency, success/failure) is
  logged and visible on `/usage`; every security-relevant action (login, evaluation, data export/deletion,
  reviews, admin changes) is recorded in a real audit log.
- **Vendor-facing output** — a searchable, filterable run history (`/data`), CSV export and a printable per-run
  report (`/reports/[runId]`), and a models-management page to rename/delete registered models.
- **Compliance-adjacent building blocks** — disclaimers at every data-entry point and app-wide, org-controlled
  data export/deletion, and the audit log above. Framed honestly as risk-reducing building blocks, not
  certification (see Non-goals).

## 4. Explicit non-goals

What Adjudica does **not** do, stated plainly so nobody assumes otherwise:

- **Not a compliance product.** Using Adjudica does not make a deployment HIPAA-compliant or otherwise
  regulatorily certified. That requires a signed BAA with the LLM provider, legal review, and organizational
  policy — none of which is a software feature.
- **No credential verification.** "Verified reviewer" is an org owner vouching for a teammate inside the product.
  There is no integration with any medical, legal, or professional licensing database. It is self-attested trust,
  not independently checked qualification.
- **No billing or pricing.** Deliberately out of scope — it requires a real Stripe account and actual pricing
  decisions that are a business call, not an engineering one.
- **No outbound webhooks.** CI integration is a synchronous, API-key-authenticated call to `/api/evaluate` that
  returns a result directly. There is no webhook-callback delivery system (URL registration, signature
  verification, retries) — the "run Adjudica on every model version push" use case is fully served by the
  synchronous call without that added complexity.
- **No email delivery.** Team invites generate a shareable link the org owner copies and sends manually; no email
  provider is integrated.
- **Not a literal multi-tool agent framework.** The judge pipeline is two real, distinct model calls
  (decompose, then verify) plus a real per-claim retrieval step and deterministic scoring — a genuine pipeline,
  but not an agent framework with arbitrary tool-calling loops.
- **Not a guarantee of correctness.** Adjudica guarantees that every claim was checked against retrieved evidence
  and that the checking is visible and auditable. It cannot guarantee the retrieved evidence itself is complete,
  current, or that the verification call never errs.

## 5. Architecture summary

- **Stack**: Next.js 16 (App Router, Turbopack) / React 19, Postgres + pgvector via Drizzle ORM, Auth.js
  (Credentials provider, JWT sessions), Vercel AI SDK against a configurable judge model (default
  `openai/gpt-5-mini` via Vercel AI Gateway).
- **Tenancy**: every table that holds customer data carries an `organizationId`; every query is scoped by it.
  Verified with an automated org-isolation test suite, not just code review.
- **Judge pipeline**: `app/api/evaluate/route.ts` — `generateObject` (decompose, not streamed) → parallel
  per-claim `retrieveEvidence` calls (pgvector cosine-distance search, fault-tolerant — a single claim's failed
  retrieval degrades to "no evidence for that claim" rather than failing the whole request) → `streamText` +
  `Output.object` (verify+diagnose, the only step streamed to the client) → deterministic score computation →
  persistence. The same pipeline serves both the interactive session (streaming) and API-key/CI (synchronous JSON)
  callers.
- **Auth boundary**: a single `proxy.ts` (Next.js middleware) gates all routes on session auth by default, with
  explicit, narrow exclusions for routes that authenticate themselves differently (API-key auth on
  `/api/evaluate`, token-based invite acceptance, the public `/welcome` landing page).
- **Testing**: Vitest — unit tests for pure logic (score computation, CSV building, API-key hashing) and
  integration tests against a real Postgres instance (org isolation, RAG retrieval with mocked embeddings only,
  calibration segmentation) — not fully mocked. GitHub Actions CI runs the suite against a real Postgres service
  container.

## 6. Known limitations & risks

- **IP-based rate limiting is in-memory and per-instance.** It doesn't coordinate across multiple serverless
  instances in production — the org-scoped rate limit (backed by real `llm_calls` rows) is the actual ceiling;
  the IP-based one is best-effort only.
- **No gold-labeled dataset behind calibration.** The human-review agreement rate is real and measured, but it's
  only as good as whoever is doing the reviewing — there is no external clinical/legal/financial gold-label
  dataset validating the judge independently of the org's own reviewers.
- **Per-claim retrieval multiplies embedding-API calls with claim count.** Verified in testing: this can trip
  provider rate limits (e.g., a free-tier Gateway account) more easily than the old single-query design did. The
  pipeline degrades gracefully (missing evidence, not a crash) but throughput on constrained plans is a real
  constraint.
- **Judge latency roughly doubled** by moving to two sequential model calls. `maxDuration` on `/api/evaluate` was
  raised to 120s to give headroom; this needs a hosting plan whose function-duration limit actually supports it.
- **Dev-environment fragility discovered during this work**: Turbopack's dev-mode file watcher was observed to
  serve stale compiled routes after edits on Windows in this environment, requiring a full process kill + cache
  clear to guarantee fresh code during manual testing. Not a production concern (production builds are not
  incrementally watched), but worth knowing if local testing behavior looks stale.

## 7. Open questions / roadmap

- **Billing model** — usage-based (per evaluation), seat-based, or flat org pricing; blocked on business
  decisions, not engineering.
- **Beyond cardiology as the flagship domain** — the product is domain-agnostic today; whether to build out a
  second fully-realized example domain (legal or financial) to prove that generality, or keep cardiology as the
  single deep example, is an open positioning question (see the landing page's "who it's for" section, which
  already generalizes in copy ahead of the product doing so in practice).
- **Real outbound webhooks** — currently explicitly out of scope; revisit if a customer's CI use case can't be
  served by a synchronous call (e.g., evaluations that legitimately need to run longer than an acceptable HTTP
  timeout).
- **Reviewer credentialing** — whether a future version should integrate any real license-verification service
  for specific regulated domains, versus keeping "verified reviewer" as org-attested trust indefinitely.
