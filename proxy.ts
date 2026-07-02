import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export default auth((req) => {
  if (req.auth) return

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL("/login", req.nextUrl.origin)
  url.searchParams.set("callbackUrl", req.nextUrl.pathname)
  return NextResponse.redirect(url)
})

export const config = {
  matcher: ["/((?!api/auth|api/signup|login|signup|_next/static|_next/image|favicon.ico|icon|apple-icon).*)"],
}
