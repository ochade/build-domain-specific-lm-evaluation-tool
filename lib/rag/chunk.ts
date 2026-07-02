const CHUNK_SIZE = 800
const OVERLAP = 100

// Splits a long paragraph on sentence boundaries so no chunk exceeds `max`.
function splitLongParagraph(paragraph: string, max: number): string[] {
  if (paragraph.length <= max) return [paragraph]
  const sentences = paragraph.split(/(?<=[.!?])\s+/)
  const parts: string[] = []
  let current = ""
  for (const sentence of sentences) {
    if (current && (current + " " + sentence).length > max) {
      parts.push(current)
      current = sentence
    } else {
      current = current ? `${current} ${sentence}` : sentence
    }
  }
  if (current) parts.push(current)
  return parts
}

// Paragraph-aware chunker: groups paragraphs up to ~CHUNK_SIZE chars, with a
// small trailing overlap carried into the next chunk for context continuity.
export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => splitLongParagraph(p, CHUNK_SIZE))

  const chunks: string[] = []
  let current = ""

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length > CHUNK_SIZE && current) {
      chunks.push(current)
      const overlapTail = current.slice(-OVERLAP)
      current = `${overlapTail}\n\n${paragraph}`
    } else {
      current = candidate
    }
  }
  if (current) chunks.push(current)

  return chunks.length ? chunks : [text.trim()].filter(Boolean)
}
