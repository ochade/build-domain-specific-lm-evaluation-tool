import { db } from "@/lib/db"
import { auditLog } from "@/lib/db/schema"

export type AuditAction =
  | "login"
  | "signup"
  | "evaluation.create"
  | "model.register"
  | "model.update"
  | "model.delete"
  | "evidence.upload"
  | "evidence.delete"
  | "review.create"
  | "run.delete"
  | "data.export"
  | "report.export"
  | "apikey.create"
  | "apikey.revoke"
  | "invite.create"
  | "invite.revoke"
  | "invite.accept"
  | "reviewer.verify"
  | "reviewer.unverify"

export interface LogAuditEventInput {
  organizationId: string
  userId?: string | null
  action: AuditAction
  resourceType?: string | null
  resourceId?: string | null
  metadata?: Record<string, unknown> | null
  ipAddress?: string | null
}

export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  try {
    await db.insert(auditLog).values({
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      action: input.action,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ?? null,
      ipAddress: input.ipAddress ?? null,
    })
  } catch (err) {
    // Observability must never break the actual feature.
    console.error("Failed to log audit event:", err)
  }
}
