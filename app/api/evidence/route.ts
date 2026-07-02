import { ingestDocument, listEvidenceDocuments } from "@/lib/db/queries"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const domain = new URL(req.url).searchParams.get("domain") ?? undefined
  const docs = await listEvidenceDocuments(session.user.organizationId, domain)
  return Response.json(docs)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { domain, title, text } = await req.json()
  if (!domain?.trim() || !title?.trim() || !text?.trim()) {
    return Response.json({ error: "domain, title, and text are required." }, { status: 400 })
  }

  const doc = await ingestDocument(session.user.organizationId, domain, title, text)
  return Response.json(doc)
}
