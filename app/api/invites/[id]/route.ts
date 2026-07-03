import { revokeInvite } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { requireOwner } from "@/lib/auth/require-owner"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { getClientIp } from "@/lib/api/rate-limit"
import { logAuditEvent } from "@/lib/audit/log"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")
    requireOwner(session)

    const { id } = await params
    const revoked = await revokeInvite(session.user.organizationId, id)
    if (!revoked) throw new ApiError(404, "Not found")

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "invite.revoke",
      resourceType: "invite",
      resourceId: id,
      ipAddress: getClientIp(req),
    })

    return Response.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
