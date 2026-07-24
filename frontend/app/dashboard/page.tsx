'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { ChatArea } from '@/components/dashboard/ChatArea'
import { DiagnosticsPanel } from '@/components/dashboard/DiagnosticsPanel'
import { UploadModal } from '@/components/dashboard/UploadModal'
import { useAuth } from '@/hooks/useAuth'
import { useDocuments } from '@/hooks/useDocuments'
import { useChat } from '@/hooks/useChat'
import type { Citation, Document, RetrievalDiagnostics } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { documents, loading, upload, remove, rename, select } = useDocuments()

  const [selected, setSelected] = useState<Document | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [activeDiagnostics, setActiveDiagnostics] = useState<RetrievalDiagnostics | null>(null)

  const { messages, pending, ask, stop, clear } = useChat(selected)

  // Protect the route.
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  // Auto-select the first ready document when none is chosen.
  useEffect(() => {
    if (!selected && documents.length > 0) {
      setSelected(documents.find((d) => d.status === 'ready') ?? documents[0])
    }
  }, [documents, selected])

  // Surface the latest assistant diagnostics in the panel.
  const latestDiagnostics = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].diagnostics) {
        return messages[i].diagnostics ?? null
      }
    }
    return null
  }, [messages])

  useEffect(() => {
    if (latestDiagnostics) setActiveDiagnostics(latestDiagnostics)
  }, [latestDiagnostics])

  function handleCitationClick(c: Citation) {
    setDiagnosticsOpen(true)
  }

  if (authLoading || !user) {
    return (
      <div className="relative flex h-screen overflow-hidden">
        {/* Sidebar Skeleton */}
        <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar backdrop-blur-xl p-5 space-y-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-primary/25 animate-pulse" />
            <div className="h-5 w-24 rounded-md bg-white/5 animate-pulse" />
          </div>
          <div className="h-10 w-full rounded-xl bg-white/5 animate-pulse" />
          <div className="space-y-3 pt-4 flex-1">
            <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
            <div className="flex items-center gap-3 rounded-xl border border-white/5 p-3">
              <div className="h-8 w-8 rounded-lg bg-white/5 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
                <div className="h-2 w-1/2 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/5 p-3">
              <div className="h-8 w-8 rounded-lg bg-white/5 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 rounded bg-white/5 animate-pulse" />
                <div className="h-2 w-1/3 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/5 p-3">
              <div className="h-8 w-8 rounded-lg bg-white/5 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
                <div className="h-2 w-1/4 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="border-t border-sidebar-border/30 pt-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/5 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
              <div className="h-2 w-12 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        </aside>

        {/* Chat Area Skeleton */}
        <main className="flex h-full flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/5 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-32 rounded bg-white/5 animate-pulse" />
                <div className="h-2.5 w-16 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 rounded-lg bg-white/5 animate-pulse" />
              <div className="h-8 w-24 rounded-lg bg-white/5 animate-pulse" />
            </div>
          </header>

          <div className="flex-1 flex flex-col justify-end p-6 space-y-6 max-w-3xl mx-auto w-full">
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-white/5 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
            <div className="flex items-start gap-4 justify-end">
              <div className="flex-1 space-y-2 flex flex-col items-end">
                <div className="h-3.5 w-1/4 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
              </div>
              <div className="h-8 w-8 rounded-full bg-white/5 animate-pulse" />
            </div>
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-white/5 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/4 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-4/5 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="border-t border-sidebar-border px-6 py-4">
            <div className="max-w-3xl mx-auto h-12 w-full rounded-2xl bg-white/5 animate-pulse" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="relative flex h-screen overflow-hidden">
      <Sidebar
        documents={documents}
        loading={loading}
        selectedId={selected?.id ?? null}
        onSelect={(doc) => {
          setSelected(doc)
          select(doc.id)
        }}
        onDelete={(id) => {
          remove(id)
          if (selected?.id === id) setSelected(null)
        }}
        onRename={rename}
        onUploadClick={() => setUploadOpen(true)}
      />

      <ChatArea
        doc={selected}
        messages={messages}
        pending={pending}
        onAsk={ask}
        onStop={stop}
        onClear={clear}
        onCitationClick={handleCitationClick}
        onOpenDiagnostics={() => setDiagnosticsOpen(true)}
        diagnosticsOpen={diagnosticsOpen}
        onUploadClick={() => setUploadOpen(true)}
      />

      <AnimatePresence>
        {diagnosticsOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full overflow-hidden"
          >
            <DiagnosticsPanel
              diagnostics={activeDiagnostics}
              onClose={() => setDiagnosticsOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={upload}
      />
    </div>
  )
}
