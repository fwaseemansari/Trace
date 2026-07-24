'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '@/lib/api'
import type { Document } from '@/types'

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      const docs = await api.listDocuments()
      setDocuments(docs)
      setError(null)
    } catch {
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Poll while any document is still processing so status badges update.
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing')
    if (hasProcessing && !pollRef.current) {
      pollRef.current = setInterval(refresh, 2500)
    } else if (!hasProcessing && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [documents, refresh])

  const upload = useCallback(
    async (file: File, onProgress: (pct: number) => void) => {
      const doc = await api.uploadDocument(file, onProgress)
      await refresh()
      return doc
    },
    [refresh],
  )

  const remove = useCallback(async (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
    await api.deleteDocument(id)
  }, [])

  const rename = useCallback(async (id: string, filename: string) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, filename } : d)))
    await api.renameDocument(id, filename)
  }, [])

  const select = useCallback(async (id: string) => {
    try {
      await api.selectDocument(id)
    } catch {
      // non-fatal — backend selection is just a convenience fallback
    }
  }, [])

  return { documents, loading, error, refresh, upload, remove, rename, select }
}
