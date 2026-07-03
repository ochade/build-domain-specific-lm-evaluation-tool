import { getRegisteredModel, updateRegisteredModel, deleteRegisteredModel } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { parseJsonBody } from "@/lib/api/parse-request"
import { updateModelRequestSchema } from "@/lib/api/schemas"
import { getClientIp } from "@/lib/api/rate-limit"
import { logAuditEvent } from "@/lib/audit/log"

const MAX_BODY_BYTES = 10_000

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const { id } = await params
    const model = await getRegisteredModel(session.user.organizationId, id)
    if (!model) throw new ApiError(404, "Not found")
    return Response.json(model)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const { id } = await params
    const body = await parseJsonBody(req, updateModelRequestSchema, MAX_BODY_BYTES)

    const model = await updateRegisteredModel(session.user.organizationId, id, body)
    if (!model) throw new ApiError(404, "Not found")

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "model.update",
      resourceType: "registered_model",
      resourceId: id,
      ipAddress: getClientIp(req),
    })

    return Response.json(model)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const { id } = await params
    const deleted = await deleteRegisteredModel(session.user.organizationId, id)
    if (!deleted) throw new ApiError(404, "Not found")

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "model.delete",
      resourceType: "registered_model",
      resourceId: id,
      ipAddress: getClientIp(req),
    })

    return Response.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
