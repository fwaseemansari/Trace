import type {
  AuthResponse,
  Citation,
  Document,
  RetrievalDiagnostics,
} from '@/types'

// In-memory mock store so the app is fully usable without a backend.
const uid = () => Math.random().toString(36).slice(2, 10)
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

let mockDocs: Document[] = [
  {
    id: 'doc-annual-report',
    filename: 'Acme_Annual_Report_2024.pdf',
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    status: 'ready',
    type: 'pdf',
    sizeBytes: 2_480_000,
  },
  {
    id: 'doc-handbook',
    filename: 'Employee_Handbook.docx',
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    status: 'ready',
    type: 'docx',
    sizeBytes: 840_000,
  },
  {
    id: 'doc-research',
    filename: 'RAG_Systems_Research.pdf',
    uploadedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    status: 'processing',
    type: 'pdf',
    sizeBytes: 5_120_000,
  },
]

export const mock = {
  async register(email: string): Promise<AuthResponse> {
    await delay(700)
    return { token: 'mock-token-' + uid(), user: { id: uid(), email } }
  },
  async login(email: string): Promise<AuthResponse> {
    await delay(700)
    return { token: 'mock-token-' + uid(), user: { id: uid(), email } }
  },
  async verify(code: string): Promise<{ ok: boolean }> {
    await delay(600)
    return { ok: code.length === 6 }
  },
  async listDocuments(): Promise<Document[]> {
    await delay(650)
    return [...mockDocs]
  },
  async deleteDocument(id: string): Promise<void> {
    await delay(300)
    mockDocs = mockDocs.filter((d) => d.id !== id)
  },
  async renameDocument(id: string, filename: string): Promise<Document> {
    await delay(300)
    mockDocs = mockDocs.map((d) => (d.id === id ? { ...d, filename } : d))
    return mockDocs.find((d) => d.id === id)!
  },
  async uploadDocument(
    file: File,
    onProgress: (pct: number) => void,
  ): Promise<Document> {
    for (let p = 0; p <= 100; p += 8) {
      await delay(90)
      onProgress(Math.min(p, 100))
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
    const doc: Document = {
      id: 'doc-' + uid(),
      filename: file.name,
      uploadedAt: new Date().toISOString(),
      status: 'processing',
      type: ext,
      sizeBytes: file.size,
    }
    mockDocs = [doc, ...mockDocs]
    // flip to ready after embeddings "generate"
    setTimeout(() => {
      mockDocs = mockDocs.map((d) =>
        d.id === doc.id ? { ...d, status: 'ready' } : d,
      )
    }, 3500)
    return doc
  },

  buildDiagnostics(
    question: string,
    doc: Document | null,
  ): { answer: string; citations: Citation[]; diagnostics: RetrievalDiagnostics } {
    const source = doc?.filename ?? 'document.pdf'
    const rewritten =
      question.length > 0
        ? `${question.replace(/\?+$/, '')} — with relevant context, definitions, and figures`
        : question
    const chunks = [
      {
        id: uid(),
        source,
        page: 2,
        score: 0.912,
        text: 'The system uses a hybrid retrieval strategy combining dense vector similarity with sparse keyword matching to maximize recall across heterogeneous documents.',
      },
      {
        id: uid(),
        source,
        page: 5,
        score: 0.874,
        text: 'Retrieved chunks are re-ranked and the top-k passages are concatenated into a bounded context window before being passed to the language model.',
      },
      {
        id: uid(),
        source,
        page: 9,
        score: 0.803,
        text: 'Citations are tracked per passage so that every generated claim can be traced back to its exact source page for verification.',
      },
    ].slice(0, 3)

    const answer =
      `Based on ${source}, here is what I found regarding "${question}".\n\n` +
      `The document describes a retrieval-augmented approach where your query is first rewritten for clarity, ` +
      `then matched against embedded passages using hybrid search. ` +
      `The most relevant sections (see citations) are combined into context and used to ground the response, ` +
      `which keeps answers accurate and verifiable.`

    const citations: Citation[] = chunks.map((c) => ({
      id: c.id,
      filename: c.source,
      page: c.page,
      score: c.score,
      snippet: c.text,
    }))

    const diagnostics: RetrievalDiagnostics = {
      originalQuery: question,
      rewrittenQuery: rewritten,
      chunks,
      context: chunks.map((c, i) => `[${i + 1}] (p.${c.page}) ${c.text}`).join('\n\n'),
      answer,
    }

    return { answer, citations, diagnostics }
  },
}

export const isMock = !process.env.NEXT_PUBLIC_API_URL
