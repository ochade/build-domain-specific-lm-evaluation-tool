import { listRegisteredModels } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { ApiError, handleApiError } from "@/lib/api/errors"

export async function GET() {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const models = await listRegisteredModels(session.user.organizationId)
    return Response.json(models)
  } catch (err) {
    return handleApiError(err)
  }
}
