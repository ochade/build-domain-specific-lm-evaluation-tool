import bcrypt from "bcryptjs"
import { acceptInvite } from "@/lib/db/queries"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { parseJsonBody } from "@/lib/api/parse-request"
import { acceptInviteRequestSchema } from "@/lib/api/schemas"
import { checkIpRateLimit, getClientIp } from "@/lib/api/rate-limit"
import { RATE_LIMIT_SIGNUP_PER_HOUR } from "@/lib/ai/config"
import { logAuditEvent } from "@/lib/audit/log"

const MAX_BODY_BYTES = 10_000

export async function POST(req: Request) {
  try {
    checkIpRateLimit(getClientIp(req), "invite-accept", { max: RATE_LIMIT_SIGNUP_PER_HOUR, windowMs: 60 * 60 * 1000 })

    const { token, name, password } = await parseJsonBody(req, acceptInviteRequestSchema, MAX_BODY_BYTES)
    const passwordHash = await bcrypt.hash(password, 12)

    let result: { organizationId: string; userId: string }
    try {
      result = await acceptInvite(token, { name, passwordHash })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not accept invite."
      const status = message.includes("already exists") ? 409 : message.includes("not found") ? 404 : 400
      throw new ApiError(status, message)
    }

    await logAuditEvent({
      organizationId: result.organizationId,
      userId: result.userId,
      action: "invite.accept",
      resourceType: "user",
      resourceId: result.userId,
      ipAddress: getClientIp(req),
    })

    return Response.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
