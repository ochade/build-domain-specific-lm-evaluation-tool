# Deployment

## Required environment variables

Set these in your hosting provider's project settings (e.g. Vercel → Project → Settings → Environment Variables) — never commit real values to `.env.local` or any tracked file. `.env.example` documents the full list with defaults.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. Must point at a database with the `pgvector` extension available (evidence embeddings use `vector(1536)`). |
| `AUTH_SECRET` | Yes | Session signing secret for Auth.js. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Rotating it invalidates all existing sessions. |
| `AI_GATEWAY_API_KEY` | Yes | Vercel AI Gateway key used for both the judge model and embeddings. |
| `JUDGE_MODEL`, `JUDGE_FALLBACK_MODEL`, `JUDGE_TIMEOUT_MS`, `JUDGE_MAX_RETRIES`, `EMBEDDING_MODEL` | No | Override the judge/embedding model and timeout behavior. Defaults in `lib/ai/config.ts`. |
| `RATE_LIMIT_EVALUATE_PER_HOUR`, `RATE_LIMIT_DERIVE_MAP_PER_HOUR`, `RATE_LIMIT_SIGNUP_PER_HOUR` | No | Per-organization / per-IP rate limits. Defaults in `lib/ai/config.ts`. |

No email-provider or PDF-rendering credentials are needed: team invites (`/admin`) return a shareable link instead of sending email, and vendor reports are a printable HTML page (`/reports/[runId]`) rather than a server-rendered PDF.

## Secrets management

- Never commit `.env.local` (it's gitignored). Use your host's encrypted environment variable store for every value above.
- `AUTH_SECRET` and `DATABASE_URL` are the two secrets that matter most — treat them like production credentials, not config.
- API keys created in `/admin` (for CI-triggered evaluations, see `lib/auth/api-key.ts`) are stored as SHA-256 hashes, never in plaintext; the raw key is shown exactly once at creation time. If a key leaks, revoke it from `/admin` immediately — this is a hard delete of trust, not a soft toggle you can undo.

## Concurrency & scaling considerations for LLM streaming calls

- **Function duration vs. judge timeout**: `app/api/evaluate/route.ts` and `app/api/derive-map/route.ts` set `maxDuration = 60` (Vercel serverless function limit). `JUDGE_TIMEOUT_MS` (default 45000ms) must stay comfortably under that, including headroom for a fallback attempt if `JUDGE_FALLBACK_MODEL` is set. If you raise `maxDuration` on your plan, raise `JUDGE_TIMEOUT_MS` proportionally, not independently.
- **Serverless concurrency**: each in-flight evaluation holds a serverless function instance open for the duration of the judge call (streaming or the synchronous API-key path). Under concurrent load (many vendors evaluating at once, or a CI system firing evaluations per model-version push), you are bound by your Vercel plan's concurrent execution limit and your AI Gateway/OpenAI account's concurrent-request and rate-limit quotas — size both deliberately if CI integration (`/admin` API keys) becomes a primary traffic source rather than occasional interactive use.
- **Database connections under serverless**: `lib/db/index.ts` opens a `postgres.js` connection per function instance. In production, point `DATABASE_URL` at a pooled connection string (e.g. a PgBouncer-fronted Postgres, or a managed pooler like Neon's/Supabase's pooled endpoint) rather than a direct connection — many concurrent serverless instances opening direct connections will exhaust Postgres's `max_connections` well before it exhausts your compute.
- **IP rate limiting is per-instance, not shared**: `checkIpRateLimit` (`lib/api/rate-limit.ts`) keeps its sliding window in in-memory process state. On serverless, each warm instance has its own counter, so the effective limit under multi-instance concurrency is `configured limit × number of warm instances`, not a hard global cap. The org-scoped limit (`checkOrgRateLimit`) is real (backed by the `llm_calls` table) and does not have this gap — treat it as the actual ceiling.
