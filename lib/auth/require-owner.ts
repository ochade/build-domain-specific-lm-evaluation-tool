import type { Session } from "next-auth"
import { ApiError } from "@/lib/api/errors"

export function requireOwner(session: Session): void {
  if (session.user.role !== "owner") {
    throw new ApiError(403, "Only an organization owner can do this.")
  }
}
