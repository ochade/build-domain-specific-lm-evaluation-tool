import { deleteRun } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { getClientIp } from "@/lib/api/rate-limit"
import { logAuditEvent } from "@/lib/audit/log"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const { id } = await params
    const deleted = await deleteRun(session.user.organizationId, id)
    if (!deleted) throw new ApiError(404, "Run not found")

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "run.delete",
      resourceType: "evaluation_run",
      resourceId: id,
      ipAddress: getClientIp(req),
    })

    return Response.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
