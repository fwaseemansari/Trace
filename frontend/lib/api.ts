import axios from 'axios'
import type {
  AuthResponse,
  Citation,
  Document,
  RetrievalDiagnostics,
} from '@/types'
import { isMock, mock } from './mock'

const API_URL = process.env.NEXT_PUBLIC_API_URL
const TOKEN_KEY = 'zen_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}
export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

export const http = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach Authorization header on every request.
http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/* ----------------------------- Auth ----------------------------- */

export async function register(email: string, password: string): Promise<AuthResponse> {
  if (isMock) return mock.register(email)
  const { data } = await http.post('/auth/register', { email, password })
  return data
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (isMock) return mock.login(email)
  const { data } = await http.post('/auth/login', { email, password })
  return data
}

export async function verify(code: string, email?: string): Promise<{ ok: boolean }> {
  if (isMock) return mock.verify(code)
  const { data } = await http.post('/auth/verify', { code, email })
  return data
}

/* --------------------------- Documents --------------------------- */

export async function listDocuments(): Promise<Document[]> {
  if (isMock) return mock.listDocuments()
  const { data } = await http.get('/documents/list')
  // Backend returns { documents: [...] }, unwrap it
  return data.documents ?? data
}

export async function uploadDocument(
  file: File,
  onProgress: (pct: number) => void,
): Promise<Document> {
  if (isMock) return mock.uploadDocument(file, onProgress)
  const form = new FormData()
  form.append('file', file)
  const { data } = await http.post('/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  // Backend returns the full Document object
  return data
}

export async function selectDocument(id: string): Promise<void> {
  if (isMock) return
  await http.post('/documents/select', { id })
}

export async function deleteDocument(id: string): Promise<void> {
  if (isMock) return mock.deleteDocument(id)
  await http.delete('/documents/delete', { data: { id } })
}

export async function renameDocument(id: string, filename: string): Promise<Document> {
  if (isMock) return mock.renameDocument(id, filename)
  const { data } = await http.put('/documents/rename', { id, filename })
  return data
}

/* ----------------------------- Chat ----------------------------- */

export async function clearChat(documentId: string | null): Promise<void> {
  if (isMock) return
  await http.post('/chat/clear', { documentId })
}

export interface AskCallbacks {
  onToken: (token: string) => void
  onCitations?: (citations: Citation[]) => void
  onDiagnostics?: (d: RetrievalDiagnostics) => void
  onDone?: () => void
  onError?: (err: unknown) => void
  signal?: AbortSignal
}

/**
 * Streams an answer token-by-token. In mock mode we simulate a streaming
 * response; against a real backend we read the SSE/streaming body via
 * fetch + ReadableStream.
 */
export async function askQuestion(
  question: string,
  documentId: string | null,
  doc: Document | null,
  cb: AskCallbacks,
): Promise<void> {
  try {
    if (isMock) {
      const { answer, citations, diagnostics } = mock.buildDiagnostics(
        question,
        doc,
      )
      // brief "thinking" pause so skeleton loader is visible
      await new Promise((r) => setTimeout(r, 900))
      const words = answer.split(' ')
      for (let i = 0; i < words.length; i++) {
        if (cb.signal?.aborted) return
        await new Promise((r) => setTimeout(r, 28))
        cb.onToken(words[i] + (i < words.length - 1 ? ' ' : ''))
      }
      cb.onCitations?.(citations)
      cb.onDiagnostics?.(diagnostics)
      cb.onDone?.()
      return
    }

    const res = await fetch(`${API_URL}/chat/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify({ question, documentId }),
      signal: cb.signal,
    })

    if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Parse SSE-style lines: `data: {...}` separated by blank lines.
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        const line = part.replace(/^data:\s*/, '').trim()
        if (!line || line === '[DONE]') continue
        try {
          const evt = JSON.parse(line)
          if (evt.token) cb.onToken(evt.token)
          if (evt.citations) cb.onCitations?.(evt.citations)
          if (evt.diagnostics) cb.onDiagnostics?.(evt.diagnostics)
        } catch {
          // Not JSON — treat as raw token text.
          cb.onToken(line)
        }
      }
    }
    cb.onDone?.()
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return
    cb.onError?.(err)
  }
}
