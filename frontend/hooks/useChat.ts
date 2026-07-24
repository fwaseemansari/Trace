'use client'

import { useCallback, useRef, useState } from 'react'
import * as api from '@/lib/api'
import type { ChatMessage, Document } from '@/types'

const uid = () => Math.random().toString(36).slice(2, 10)

export function useChat(doc: Document | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim() || pending) return

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: question,
        createdAt: new Date().toISOString(),
      }
      const assistantId = uid()
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        streaming: true,
      }
      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setPending(true)

      const controller = new AbortController()
      abortRef.current = controller

      await api.askQuestion(question, doc?.id ?? null, doc, {
        signal: controller.signal,
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + token } : m,
            ),
          )
        },
        onCitations: (citations) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, citations } : m)),
          )
        },
        onDiagnostics: (diagnostics) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, diagnostics } : m)),
          )
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
          )
          setPending(false)
        },
        onError: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    streaming: false,
                    content:
                      m.content ||
                      'Something went wrong reaching the server. Please try again.',
                  }
                : m,
            ),
          )
          setPending(false)
        },
      })
    },
    [doc, pending],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setPending(false)
    setMessages((prev) => prev.map((m) => ({ ...m, streaming: false })))
  }, [])

  const clear = useCallback(async () => {
    setMessages([])
    try {
      await api.clearChat(doc?.id ?? null)
    } catch {
      /* ignore */
    }
  }, [doc])

  return { messages, pending, ask, stop, clear }
}
