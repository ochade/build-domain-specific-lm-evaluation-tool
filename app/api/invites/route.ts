import { listPendingInvites, createInvite } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { requireOwner } from "@/lib/auth/require-owner"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { parseJsonBody } from "@/lib/api/parse-request"
import { inviteRequestSchema } from "@/lib/api/schemas"
import { getClientIp } from "@/lib/api/rate-limit"
import { logAuditEvent } from "@/lib/audit/log"

const MAX_BODY_BYTES = 5_000

export async function GET() {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")
    requireOwner(session)

    const pending = await listPendingInvites(session.user.organizationId)
    return Response.json(pending)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")
    requireOwner(session)

    const { email, role } = await parseJsonBody(req, inviteRequestSchema, MAX_BODY_BYTES)

    const invite = await createInvite(session.user.organizationId, {
      email,
      role,
      invitedByUserId: session.user.id,
    })

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "invite.create",
      resourceType: "invite",
      resourceId: invite.id,
      metadata: { email },
      ipAddress: getClientIp(req),
    })

    return Response.json({ id: invite.id, email: invite.email, role: invite.role, token: invite.token })
  } catch (err) {
    return handleApiError(err)
  }
}
