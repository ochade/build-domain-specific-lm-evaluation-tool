import type { ZodType } from "zod"
import { ApiError } from "@/lib/api/errors"

// Reads the request body incrementally and aborts as soon as the byte count
// exceeds `maxBytes` — doesn't trust `Content-Length` (a client can lie
// about it) and doesn't fully buffer an oversized body into memory first.
async function readBodyWithLimit(req: Request, maxBytes: number): Promise<string> {
  const reader = req.body?.getReader()
  if (!reader) return ""

  const decoder = new TextDecoder()
  let received = 0
  let text = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    if (received > maxBytes) {
      await reader.cancel()
      throw new ApiError(413, `Request body exceeds the ${maxBytes}-byte limit.`)
    }
    text += decoder.decode(value, { stream: true })
  }
  text += decoder.decode()
  return text
}

export async function parseJsonBody<T>(req: Request, schema: ZodType<T>, maxBytes: number): Promise<T> {
  const text = await readBodyWithLimit(req, maxBytes)

  let json: unknown
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    throw new ApiError(400, "Request body is not valid JSON.")
  }

  const result = schema.safeParse(json)
  if (!result.success) {
    throw ApiError.fromZodError(result.error)
  }
  return result.data
}
