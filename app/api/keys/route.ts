import { listApiKeys, insertApiKey } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { requireOwner } from "@/lib/auth/require-owner"
import { generateApiKey } from "@/lib/auth/api-key"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { parseJsonBody } from "@/lib/api/parse-request"
import { createApiKeyRequestSchema } from "@/lib/api/schemas"
import { getClientIp } from "@/lib/api/rate-limit"
import { logAuditEvent } from "@/lib/audit/log"

const MAX_BODY_BYTES = 5_000

export async function GET() {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")
    requireOwner(session)

    const keys = await listApiKeys(session.user.organizationId)
    return Response.json(keys)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")
    requireOwner(session)

    const { name } = await parseJsonBody(req, createApiKeyRequestSchema, MAX_BODY_BYTES)
    const { raw, hash, prefix } = generateApiKey()

    const key = await insertApiKey(session.user.organizationId, {
      name,
      keyHash: hash,
      keyPrefix: prefix,
      createdByUserId: session.user.id,
    })

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "apikey.create",
      resourceType: "api_key",
      resourceId: key.id,
      ipAddress: getClientIp(req),
    })

    // The raw key is only ever returned here, at creation time.
    return Response.json({ id: key.id, name: key.name, key: raw, keyPrefix: key.keyPrefix, createdAt: key.createdAt })
  } catch (err) {
    return handleApiError(err)
  }
}
