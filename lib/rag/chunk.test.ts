import { describe, it, expect } from "vitest"
import { chunkText } from "@/lib/rag/chunk"

describe("chunkText", () => {
  it("returns an empty array for empty/whitespace input", () => {
    expect(chunkText("")).toEqual([])
    expect(chunkText("   \n\n  ")).toEqual([])
  })

  it("returns a single chunk for short text", () => {
    const chunks = chunkText("A short paragraph about cardiology.")
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe("A short paragraph about cardiology.")
  })

  it("groups multiple short paragraphs into one chunk", () => {
    const text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
    const chunks = chunkText(text)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toContain("Paragraph one.")
    expect(chunks[0]).toContain("Paragraph three.")
  })

  it("splits into multiple chunks once accumulated size exceeds the target, with overlap carried forward", () => {
    const paragraph = "X".repeat(700)
    const text = [paragraph, paragraph, paragraph].join("\n\n")
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)
    // The overlap tail of the previous chunk should appear at the start of the next.
    const overlapTail = chunks[0].slice(-100)
    expect(chunks[1].startsWith(overlapTail)).toBe(true)
  })

  it("splits a single paragraph longer than the chunk size on sentence boundaries", () => {
    const sentence = "This is a clinical sentence about STEMI management. "
    const longParagraph = sentence.repeat(30) // well over 800 chars, no blank-line breaks
    const chunks = chunkText(longParagraph)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      // Each produced chunk should end on a sentence boundary, not mid-sentence.
      expect(chunk.trim().endsWith(".")).toBe(true)
    }
  })
})
