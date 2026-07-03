import { setReviewerVerified } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { requireOwner } from "@/lib/auth/require-owner"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { parseJsonBody } from "@/lib/api/parse-request"
import { setReviewerVerifiedRequestSchema } from "@/lib/api/schemas"
import { getClientIp } from "@/lib/api/rate-limit"
import { logAuditEvent } from "@/lib/audit/log"

const MAX_BODY_BYTES = 1_000

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")
    requireOwner(session)

    const { id } = await params
    const { verified } = await parseJsonBody(req, setReviewerVerifiedRequestSchema, MAX_BODY_BYTES)

    const updated = await setReviewerVerified(session.user.organizationId, id, verified)
    if (!updated) throw new ApiError(404, "Not found")

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: verified ? "reviewer.verify" : "reviewer.unverify",
      resourceType: "user",
      resourceId: id,
      ipAddress: getClientIp(req),
    })

    return Response.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
