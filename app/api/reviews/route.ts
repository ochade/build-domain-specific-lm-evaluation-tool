import { upsertClaimReview, listClaimReviews } from "@/lib/db/queries"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const runId = new URL(req.url).searchParams.get("runId")
  if (!runId) return Response.json({ error: "runId is required" }, { status: 400 })

  const reviews = await listClaimReviews(session.user.organizationId, runId)
  return Response.json(reviews)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { runId, claimId, humanVerdict, note } = await req.json()
  if (!runId || !claimId || !humanVerdict) {
    return Response.json({ error: "runId, claimId, and humanVerdict are required" }, { status: 400 })
  }

  try {
    const review = await upsertClaimReview(session.user.organizationId, session.user.id, {
      runId,
      claimId,
      humanVerdict,
      note: note || null,
    })
    return Response.json(review)
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Could not save review." }, { status: 400 })
  }
}
