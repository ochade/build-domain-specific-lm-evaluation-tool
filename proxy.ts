import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export default auth((req) => {
  if (req.auth) return

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // A cold, unauthenticated visit to the root should land on the marketing
  // page (explains what this is) rather than a bare login form.
  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/welcome", req.nextUrl.origin))
  }

  const url = new URL("/login", req.nextUrl.origin)
  url.searchParams.set("callbackUrl", req.nextUrl.pathname)
  return NextResponse.redirect(url)
})

export const config = {
  // /api/evaluate is excluded because it accepts either a session OR an
  // API key (for CI-triggered evaluations) and does that check itself —
  // this proxy only knows about session auth, so it can't gate that route.
  // /api/invites/accept and /invite/[token] are public, token-authenticated
  // routes (the invitee has no account/session yet).
  // /welcome is the public marketing landing page.
  matcher: [
    "/((?!api/auth|api/signup|api/evaluate|api/invites/accept|invite/|login|signup|welcome|_next/static|_next/image|favicon.ico|icon|apple-icon).*)",
  ],
}
