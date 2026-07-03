import { z } from "zod"
import type { Verdict } from "@/lib/data"

const VERDICTS = ["supported", "hallucinated", "unsupported", "retrieval-gap"] as const satisfies readonly Verdict[]
const verdictSchema = z.enum(VERDICTS)

const shortText = (max: number) => z.string().trim().min(1).max(max)
const longText = (max: number) => z.string().max(max)
const uuid = z.string().uuid()

export const evaluateRequestSchema = z.object({
  model: z.string().max(200).optional(),
  domain: shortText(200),
  spec: longText(50_000).optional(),
  prompt: longText(50_000).min(1, "prompt is required"),
  response: longText(50_000).min(1, "response is required"),
  sources: longText(50_000).optional(),
  registeredModelId: uuid.optional().nullable(),
})

export const deriveMapRequestSchema = z.object({
  model: z.string().max(200).optional(),
  domain: shortText(200),
  audience: z.string().max(200).optional(),
  spec: longText(50_000).min(20, "spec must be at least 20 characters"),
})

export const evidenceIngestSchema = z.object({
  domain: shortText(200),
  title: shortText(300),
  text: longText(200_000).min(1, "text is required"),
})

export const reviewRequestSchema = z.object({
  runId: uuid,
  claimId: shortText(100),
  humanVerdict: verdictSchema,
  note: z.string().max(2_000).optional().nullable(),
})

export const signupRequestSchema = z.object({
  organizationName: shortText(200),
  name: shortText(200),
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
})

export const updateModelRequestSchema = z.object({
  model: shortText(200).optional(),
  domain: shortText(200).optional(),
  audience: shortText(200).optional(),
})

const roleSchema = z.enum(["owner", "member"])

export const inviteRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  role: roleSchema.default("member"),
})

export const acceptInviteRequestSchema = z.object({
  token: shortText(200),
  name: shortText(200),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
})

export const createApiKeyRequestSchema = z.object({
  name: shortText(200),
})

export const setReviewerVerifiedRequestSchema = z.object({
  verified: z.boolean(),
})
