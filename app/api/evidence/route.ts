import { ingestDocument, listEvidenceDocuments } from "@/lib/db/queries"
import { auth } from "@/lib/auth"
import { ApiError, handleApiError } from "@/lib/api/errors"
import { parseJsonBody } from "@/lib/api/parse-request"
import { evidenceIngestSchema } from "@/lib/api/schemas"
import { getClientIp } from "@/lib/api/rate-limit"
import { logAuditEvent } from "@/lib/audit/log"

const MAX_BODY_BYTES = 300_000

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const domain = new URL(req.url).searchParams.get("domain") ?? undefined
    const docs = await listEvidenceDocuments(session.user.organizationId, domain)
    return Response.json(docs)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) throw new ApiError(401, "Unauthorized")

    const { domain, title, text } = await parseJsonBody(req, evidenceIngestSchema, MAX_BODY_BYTES)
    const doc = await ingestDocument(session.user.organizationId, domain, title, text)

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "evidence.upload",
      resourceType: "evidence_document",
      resourceId: doc.id,
      metadata: { title, domain },
      ipAddress: getClientIp(req),
    })

    return Response.json(doc)
  } catch (err) {
    return handleApiError(err)
  }
}
