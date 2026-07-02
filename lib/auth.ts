import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users, organizations } from "@/lib/db/schema"

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const [row] = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            passwordHash: users.passwordHash,
            organizationId: users.organizationId,
            organizationName: organizations.name,
          })
          .from(users)
          .innerJoin(organizations, eq(organizations.id, users.organizationId))
          .where(eq(users.email, email))

        if (!row) return null
        const valid = await bcrypt.compare(password, row.passwordHash)
        if (!valid) return null

        return {
          id: row.id,
          email: row.email,
          name: row.name,
          organizationId: row.organizationId,
          organizationName: row.organizationName,
        }
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.organizationId = user.organizationId
        token.organizationName = user.organizationName
      }
      return token
    },
    session: ({ session, token }) => {
      session.user.id = token.sub!
      session.user.organizationId = token.organizationId as string
      session.user.organizationName = token.organizationName as string
      return session
    },
  },
})
