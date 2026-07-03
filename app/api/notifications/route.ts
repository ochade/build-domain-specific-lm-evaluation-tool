import { listRecentAuditEventsForNotifications, countUnseenAuditEvents, getNotificationsSeenAt } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { ApiError, handleApiError } from "@/lib/api/errors"

export async function GET() {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const [events, seenAt] = await Promise.all([
      listRecentAuditEventsForNotifications(session.user.organizationId, 20),
      getNotificationsSeenAt(session.user.id),
    ])
    const unseenCount = await countUnseenAuditEvents(session.user.organizationId, seenAt)

    return Response.json({ events, unseenCount })
  } catch (err) {
    return handleApiError(err)
  }
}
