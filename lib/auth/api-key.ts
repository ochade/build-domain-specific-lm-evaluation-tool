import { randomBytes, createHash } from "node:crypto"
import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { apiKeys } from "@/lib/db/schema"

const KEY_PREFIX = "adj_"

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = KEY_PREFIX + randomBytes(24).toString("base64url")
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, 12) }
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

export interface ApiKeyAuthResult {
  organizationId: string
  apiKeyId: string
}

export async function authenticateApiKey(req: Request): Promise<ApiKeyAuthResult | null> {
  const header = req.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return null

  const raw = header.slice("Bearer ".length).trim()
  if (!raw.startsWith(KEY_PREFIX)) return null

  const hash = hashApiKey(raw)
  const [row] = await db
    .select({ id: apiKeys.id, organizationId: apiKeys.organizationId })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))

  if (!row) return null

  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .catch((err) => console.error("Failed to update API key lastUsedAt:", err))

  return { organizationId: row.organizationId, apiKeyId: row.id }
}
