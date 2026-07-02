import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { organizations, users } from "@/lib/db/schema"

export async function POST(req: Request) {
  const { organizationName, name, email, password } = await req.json()

  if (!organizationName?.trim() || !name?.trim() || !email?.trim() || !password) {
    return Response.json({ error: "All fields are required." }, { status: 400 })
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 })
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email))
  if (existing) {
    return Response.json({ error: "An account with that email already exists." }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.transaction(async (tx) => {
    const [org] = await tx.insert(organizations).values({ name: organizationName }).returning()
    await tx.insert(users).values({
      organizationId: org.id,
      email,
      name,
      passwordHash,
    })
  })

  return Response.json({ ok: true })
}
