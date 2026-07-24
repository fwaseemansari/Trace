export interface User {
  id: string
  email: string
  name?: string
}

export type DocumentStatus = 'processing' | 'ready' | 'error'

export interface Document {
  id: string
  filename: string
  uploadedAt: string
  status: DocumentStatus
  sizeBytes?: number
  type?: string
}

export interface Citation {
  id: string
  filename: string
  page: number
  score?: number
  snippet?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  createdAt: string
  streaming?: boolean
  diagnostics?: RetrievalDiagnostics
}

export interface RetrievedChunk {
  id: string
  source: string
  page: number
  score: number
  text: string
}

export interface RetrievalDiagnostics {
  originalQuery: string
  rewrittenQuery: string
  chunks: RetrievedChunk[]
  context: string
  answer: string
}



export interface AuthResponse {
  token: string
  user: User
}
