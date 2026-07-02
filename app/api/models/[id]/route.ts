import { getRegisteredModel } from "@/lib/db/queries"
import { auth } from "@/lib/auth"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const model = await getRegisteredModel(session.user.organizationId, id)
  if (!model) return Response.json({ error: "Not found" }, { status: 404 })
  return Response.json(model)
}
