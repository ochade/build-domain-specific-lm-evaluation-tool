import { describe, it, expect, vi } from "vitest"
import { EMBEDDING_DIMENSIONS } from "@/lib/db/schema"
import { createTestOrg } from "@/lib/db/test-helpers"
import { ingestDocument, retrieveEvidence, listEvidenceDocuments } from "@/lib/db/queries"

// Mock only the embedding calls (real network/API calls) — everything else
// (chunking, Postgres storage, pgvector similarity search/ordering) is real.
// A one-hot vector per input lets us fully control which chunk should rank
// closest to a given query, without touching a real embedding model.
function oneHotVector(index: number): number[] {
  const v = new Array(EMBEDDING_DIMENSIONS).fill(0)
  v[index] = 1
  return v
}

const textToVector = new Map<string, number[]>()

vi.mock("ai", async (importOriginal) => {
  const original = await importOriginal<typeof import("ai")>()
  return {
    ...original,
    embed: vi.fn(async ({ value }: { value: string }) => ({
      embedding: textToVector.get(value) ?? oneHotVector(999),
      usage: { tokens: value.length },
    })),
    embedMany: vi.fn(async ({ values }: { values: string[] }) => ({
      embeddings: values.map((v) => textToVector.get(v) ?? oneHotVector(999)),
      usage: { tokens: values.reduce((sum, v) => sum + v.length, 0) },
    })),
  }
})

describe("ingestDocument / retrieveEvidence (real pgvector, mocked embeddings)", () => {
  it("ingests a document into real Postgres/pgvector and lists it with a chunk count", async () => {
    const org = await createTestOrg()
    textToVector.set("Aspirin is first-line for suspected ACS.", oneHotVector(0))

    const doc = await ingestDocument(org.id, "Cardiology", "Test Guideline", "Aspirin is first-line for suspected ACS.")

    expect(doc.chunkCount).toBe(1)
    const docs = await listEvidenceDocuments(org.id, "Cardiology")
    expect(docs).toHaveLength(1)
    expect(docs[0].chunkCount).toBe(1)
  })

  it("retrieves the closest chunk by real cosine-distance ordering, tagged E1, E2, ...", async () => {
    const org = await createTestOrg()
    const relevantText = "Primary PCI is preferred for STEMI."
    const irrelevantText = "Unrelated orthopedic content."
    textToVector.set(relevantText, oneHotVector(0))
    textToVector.set(irrelevantText, oneHotVector(500))

    await ingestDocument(org.id, "Cardiology", "Relevant Doc", relevantText)
    await ingestDocument(org.id, "Cardiology", "Irrelevant Doc", irrelevantText)

    const query = "query about STEMI management"
    textToVector.set(query, oneHotVector(0)) // identical to the relevant chunk's vector

    const results = await retrieveEvidence(org.id, "Cardiology", query, 2)

    expect(results).toHaveLength(2)
    expect(results[0].tag).toBe("E1")
    expect(results[0].documentTitle).toBe("Relevant Doc")
    expect(results[1].documentTitle).toBe("Irrelevant Doc")
  })

  it("scopes retrieval by domain — a chunk ingested under a different domain is not returned", async () => {
    const org = await createTestOrg()
    const text = "Cardiology-specific content."
    textToVector.set(text, oneHotVector(0))
    await ingestDocument(org.id, "Clinical Cardiology", "Doc", text)

    const query = "query"
    textToVector.set(query, oneHotVector(0))
    const results = await retrieveEvidence(org.id, "Orthopedic Surgery", query, 5)

    expect(results).toHaveLength(0)
  })
})
