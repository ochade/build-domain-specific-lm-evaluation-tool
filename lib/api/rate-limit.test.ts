import { describe, it, expect, vi, afterEach } from "vitest"
import { checkIpRateLimit } from "@/lib/api/rate-limit"
import { ApiError } from "@/lib/api/errors"

describe("checkIpRateLimit", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows requests under the limit", () => {
    const ip = `1.2.3.${Math.random()}`
    for (let i = 0; i < 3; i++) {
      expect(() => checkIpRateLimit(ip, "test-bucket", { max: 3, windowMs: 60_000 })).not.toThrow()
    }
  })

  it("throws a 429 ApiError once the limit is exceeded within the window", () => {
    const ip = `1.2.3.${Math.random()}`
    checkIpRateLimit(ip, "test-bucket", { max: 2, windowMs: 60_000 })
    checkIpRateLimit(ip, "test-bucket", { max: 2, windowMs: 60_000 })

    try {
      checkIpRateLimit(ip, "test-bucket", { max: 2, windowMs: 60_000 })
      expect.unreachable("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).status).toBe(429)
    }
  })

  it("does not conflate different buckets or different IPs", () => {
    const ip = `1.2.3.${Math.random()}`
    checkIpRateLimit(ip, "bucket-a", { max: 1, windowMs: 60_000 })
    // Same IP, different bucket — should not be affected by bucket-a's count.
    expect(() => checkIpRateLimit(ip, "bucket-b", { max: 1, windowMs: 60_000 })).not.toThrow()
    // Different IP, same bucket as bucket-a — should not be affected either.
    expect(() => checkIpRateLimit(`9.9.9.${Math.random()}`, "bucket-a", { max: 1, windowMs: 60_000 })).not.toThrow()
  })

  it("resets once the window elapses", () => {
    vi.useFakeTimers()
    const ip = `1.2.3.${Math.random()}`
    checkIpRateLimit(ip, "test-bucket", { max: 1, windowMs: 1000 })
    expect(() => checkIpRateLimit(ip, "test-bucket", { max: 1, windowMs: 1000 })).toThrow()

    vi.advanceTimersByTime(1500)
    expect(() => checkIpRateLimit(ip, "test-bucket", { max: 1, windowMs: 1000 })).not.toThrow()
  })
})
