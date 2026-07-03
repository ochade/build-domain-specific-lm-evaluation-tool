import { deleteEvidenceDocument } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { getClientIp } from "@/lib/api/rate-limit"
import { logAuditEvent } from "@/lib/audit/log"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const { id } = await params
    await deleteEvidenceDocument(session.user.organizationId, id)

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "evidence.delete",
      resourceType: "evidence_document",
      resourceId: id,
      ipAddress: getClientIp(req),
    })

    return Response.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
