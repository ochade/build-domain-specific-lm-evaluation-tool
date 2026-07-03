import { markNotificationsSeen } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { ApiError, handleApiError } from "@/lib/api/errors"

export async function POST() {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    await markNotificationsSeen(session.user.id)
    return Response.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
