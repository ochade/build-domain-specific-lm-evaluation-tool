"use client"

import { useState } from "react"
import { Gavel, ChevronDown, Search, LogOut } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { NotificationsBell } from "@/components/notifications-bell"

const tabs = [
  { label: "Evaluations", href: "/" },
  { label: "New Evaluation", href: "/evaluate" },
  { label: "Compare", href: "/compare" },
  { label: "Onboard Domain", href: "/onboarding" },
  { label: "Models", href: "/models" },
  { label: "Quality", href: "/quality" },
  { label: "Usage", href: "/usage" },
  { label: "Data", href: "/data" },
  { label: "Audit Log", href: "/audit-log" },
]

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const isOwner = session?.user?.role === "owner"

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Gavel className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Adjudica</span>
        </Link>

        <div className="hidden items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground md:flex">
          {session?.user?.organizationName ?? "Workspace"}
          <ChevronDown className="size-3.5" />
        </div>

        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {[...tabs, ...(isOwner ? [{ label: "Admin", href: "/admin" }] : [])].map((tab) => {
            const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={
                  active
                    ? "rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground"
                    : "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => router.push("/data")}
            className="hidden items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:flex"
          >
            <Search className="size-3.5" />
            <span>Search runs</span>
            <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">⌘K</kbd>
          </button>
          <NotificationsBell />
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="size-8 rounded-full bg-gradient-to-br from-primary/80 to-chart-2/80"
              aria-label="Account"
            />
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-50 w-56 rounded-md border border-border bg-card p-1.5 shadow-lg">
                  <div className="px-2.5 py-2 text-xs text-muted-foreground">
                    Signed in as
                    <div className="mt-0.5 truncate text-sm font-medium text-foreground">{session?.user?.email}</div>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    <LogOut className="size-3.5" /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
