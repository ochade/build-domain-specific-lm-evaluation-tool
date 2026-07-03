import { getRun } from "@/lib/db/queries"
import { buildRunCsv } from "@/lib/reports/csv"
import { auth } from "@/lib/auth"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { getClientIp } from "@/lib/api/rate-limit"
import { logAuditEvent } from "@/lib/audit/log"

export async function GET(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const { runId } = await params
    const run = await getRun(session.user.organizationId, runId)
    if (!run) throw new ApiError(404, "Not found")

    const csv = buildRunCsv(run)

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "report.export",
      resourceType: "evaluation_run",
      resourceId: runId,
      ipAddress: getClientIp(req),
    })

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="adjudica-report-${runId.slice(0, 8)}.csv"`,
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
