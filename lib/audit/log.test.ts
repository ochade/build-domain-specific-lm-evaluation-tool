import { describe, it, expect, vi, afterEach } from "vitest"
import { db } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit/log"

describe("logAuditEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("resolves even when the underlying insert fails", async () => {
    vi.spyOn(db, "insert").mockImplementation(() => {
      throw new Error("connection lost")
    })
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(
      logAuditEvent({ organizationId: "org-1", action: "login", ipAddress: "1.2.3.4" }),
    ).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalled()
  })

  it("passes through optional fields with null defaults", async () => {
    const values = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(db, "insert").mockReturnValue({ values } as unknown as ReturnType<typeof db.insert>)

    await logAuditEvent({ organizationId: "org-1", action: "signup" })

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        action: "signup",
        userId: null,
        resourceType: null,
        resourceId: null,
        metadata: null,
        ipAddress: null,
      }),
    )
  })
})
