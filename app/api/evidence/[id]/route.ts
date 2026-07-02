import { deleteEvidenceDocument } from "@/lib/db/queries"
import { auth } from "@/lib/auth"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await deleteEvidenceDocument(session.user.organizationId, id)
  return Response.json({ ok: true })
}
