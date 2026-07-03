import { exportOrganizationData } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { getClientIp } from "@/lib/api/rate-limit"
import { logAuditEvent } from "@/lib/audit/log"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const data = await exportOrganizationData(session.user.organizationId)

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "data.export",
      resourceType: "organization",
      resourceId: session.user.organizationId,
      ipAddress: getClientIp(req),
    })

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="adjudica-export-${session.user.organizationId}.json"`,
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
