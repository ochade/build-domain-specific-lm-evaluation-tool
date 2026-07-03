import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { organizations, users } from "@/lib/db/schema"
import { handleApiError, ApiError } from "@/lib/api/errors"
import { parseJsonBody } from "@/lib/api/parse-request"
import { signupRequestSchema } from "@/lib/api/schemas"
import { checkIpRateLimit, getClientIp } from "@/lib/api/rate-limit"
import { RATE_LIMIT_SIGNUP_PER_HOUR } from "@/lib/ai/config"
import { logAuditEvent } from "@/lib/audit/log"

const MAX_BODY_BYTES = 10_000

export async function POST(req: Request) {
  try {
    checkIpRateLimit(getClientIp(req), "signup", { max: RATE_LIMIT_SIGNUP_PER_HOUR, windowMs: 60 * 60 * 1000 })

    const { organizationName, name, email, password } = await parseJsonBody(req, signupRequestSchema, MAX_BODY_BYTES)

    const [existing] = await db.select().from(users).where(eq(users.email, email))
    if (existing) {
      throw new ApiError(409, "An account with that email already exists.")
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const { orgId, userId } = await db.transaction(async (tx) => {
      const [org] = await tx.insert(organizations).values({ name: organizationName }).returning()
      const [user] = await tx
        .insert(users)
        .values({
          organizationId: org.id,
          email,
          name,
          passwordHash,
          role: "owner",
        })
        .returning()
      return { orgId: org.id, userId: user.id }
    })

    await logAuditEvent({
      organizationId: orgId,
      userId,
      action: "signup",
      resourceType: "organization",
      resourceId: orgId,
      ipAddress: getClientIp(req),
    })

    return Response.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
