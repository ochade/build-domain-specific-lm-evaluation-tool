"use client"

import { Gavel, ChevronDown, Search, Bell } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { evaluation } from "@/lib/data"

const tabs = [
  { label: "Evaluations", href: "/" },
  { label: "New Evaluation", href: "/evaluate" },
  { label: "Compare", href: "/compare" },
  { label: "Onboard Domain", href: "/onboarding" },
]

export function TopNav() {
  const pathname = usePathname()

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
          {evaluation.vendor}
          <ChevronDown className="size-3.5" />
        </div>

        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {tabs.map((tab) => {
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
          <button className="hidden items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:flex">
            <Search className="size-3.5" />
            <span>Search runs</span>
            <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">⌘K</kbd>
          </button>
          <button
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </button>
          <div className="size-8 rounded-full bg-gradient-to-br from-primary/80 to-chart-2/80" aria-label="Account" />
        </div>
      </div>
    </header>
  )
}
