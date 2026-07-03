"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"

interface NotificationEvent {
  id: string
  createdAt: string
  action: string
  resourceType: string | null
  resourceId: string | null
  userEmail: string | null
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<NotificationEvent[]>([])
  const [unseenCount, setUnseenCount] = useState(0)

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { events: NotificationEvent[]; unseenCount: number } | null) => {
        if (!data) return
        setEvents(data.events)
        setUnseenCount(data.unseenCount)
      })
      .catch(() => {})
  }, [])

  async function handleOpen() {
    const next = !open
    setOpen(next)
    if (next && unseenCount > 0) {
      setUnseenCount(0)
      await fetch("/api/notifications/seen", { method: "POST" }).catch(() => {})
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unseenCount > 0 && (
          <span className="absolute right-1 top-1 flex size-2 rounded-full bg-destructive" aria-hidden />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 rounded-md border border-border bg-card p-1.5 shadow-lg">
            <div className="px-2.5 py-2 text-xs font-medium text-muted-foreground">Recent activity</div>
            {events.length === 0 ? (
              <p className="px-2.5 py-3 text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <ul className="max-h-80 space-y-0.5 overflow-y-auto">
                {events.map((e) => (
                  <li key={e.id} className="rounded-md px-2.5 py-2 text-xs hover:bg-secondary">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-mono">{e.action}</span>
                      <span className="text-muted-foreground">{e.createdAt.slice(0, 16).replace("T", " ")}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {e.userEmail ?? "System"}
                      {e.resourceType ? ` · ${e.resourceType}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
