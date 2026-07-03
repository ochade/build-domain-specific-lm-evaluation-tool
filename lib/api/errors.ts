import type { ZodError } from "zod"

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }

  static fromZodError(error: ZodError): ApiError {
    return new ApiError(400, "Invalid request body.", error.issues)
  }
}

export function handleApiError(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json({ error: err.message, details: err.details }, { status: err.status })
  }
  // Never let a raw provider/library error escape uncaught — that previously
  // crashed Next's own error handling instead of producing a normal response.
  console.error("Unhandled API error:", err)
  return Response.json({ error: "Something went wrong." }, { status: 500 })
}
