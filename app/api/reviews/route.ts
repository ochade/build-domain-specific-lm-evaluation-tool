import { upsertClaimReview, listClaimReviews } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { parseJsonBody } from "@/lib/api/parse-request"
import { reviewRequestSchema } from "@/lib/api/schemas"
import { getClientIp } from "@/lib/api/rate-limit"
import { logAuditEvent } from "@/lib/audit/log"

const MAX_BODY_BYTES = 10_000

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const runId = new URL(req.url).searchParams.get("runId")
    if (!runId) throw new ApiError(400, "runId is required")

    const reviews = await listClaimReviews(session.user.organizationId, runId)
    return Response.json(reviews)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const { runId, claimId, humanVerdict, note } = await parseJsonBody(req, reviewRequestSchema, MAX_BODY_BYTES)

    const review = await upsertClaimReview(session.user.organizationId, session.user.id, {
      runId,
      claimId,
      humanVerdict,
      note: note || null,
    })

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "review.create",
      resourceType: "claim_review",
      resourceId: review.id,
      metadata: { runId, claimId, humanVerdict },
      ipAddress: getClientIp(req),
    })

    return Response.json(review)
  } catch (err) {
    if (err instanceof ApiError) return handleApiError(err)
    return Response.json({ error: err instanceof Error ? err.message : "Could not save review." }, { status: 400 })
  }
}
