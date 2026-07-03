import { ApiError } from "@/lib/api/errors"
import { countLlmCallsSince } from "@/lib/db/queries"

export async function checkOrgRateLimit(
  organizationId: string,
  route: string,
  { max, windowMs }: { max: number; windowMs: number },
): Promise<void> {
  const since = new Date(Date.now() - windowMs)
  const count = await countLlmCallsSince(organizationId, route, since)
  if (count >= max) {
    throw new ApiError(429, `Rate limit reached: max ${max} "${route}" calls per ${Math.round(windowMs / 60_000)} minute(s).`)
  }
}

// In-memory sliding-window limiter for routes with no organization to key on
// yet (e.g. signup). Best-effort and single-instance only — if this app runs
// as multiple serverless instances, each gets its own counter. Swap this map
// for a shared store (Redis/Upstash) if that matters for your deployment.
const ipHits = new Map<string, number[]>()

export function checkIpRateLimit(ip: string, bucket: string, { max, windowMs }: { max: number; windowMs: number }): void {
  const key = `${bucket}:${ip}`
  const now = Date.now()
  const windowStart = now - windowMs
  const hits = (ipHits.get(key) ?? []).filter((t) => t > windowStart)

  if (hits.length >= max) {
    throw new ApiError(429, `Rate limit reached: max ${max} "${bucket}" requests per ${Math.round(windowMs / 60_000)} minute(s).`)
  }

  hits.push(now)
  ipHits.set(key, hits)
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}
