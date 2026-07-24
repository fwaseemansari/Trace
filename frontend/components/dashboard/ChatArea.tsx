'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  CornerDownLeft,
  PanelRightOpen,
  Paperclip,
  RotateCcw,
  Send,
  StopCircle,
} from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { MessageSkeleton } from '@/components/shared/SkeletonLoader'
import { MessageBubble } from './MessageBubble'
import { StatusBadge } from './StatusBadge'
import { getFileMeta } from './fileIcon'
import type { ChatMessage, Citation, Document } from '@/types'
import { cn } from '@/lib/utils'

const MAX_CHARS = 2000

export function ChatArea({
  doc,
  messages,
  pending,
  onAsk,
  onStop,
  onClear,
  onCitationClick,
  onOpenDiagnostics,
  diagnosticsOpen,
  onUploadClick,
}: {
  doc: Document | null
  messages: ChatMessage[]
  pending: boolean
  onAsk: (q: string) => void
  onStop: () => void
  onClear: () => void
  onCitationClick: (c: Citation) => void
  onOpenDiagnostics: () => void
  diagnosticsOpen: boolean
  onUploadClick: () => void
}) {
  const [value, setValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const waiting = pending && messages[messages.length - 1]?.content === ''

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function submit() {
    const q = value.trim()
    if (!q || pending) return
    onAsk(q)
    setValue('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      submit()
    }
  }

  return (
    <section className="flex h-full flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-sidebar-border px-6 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          {doc ? (
            <>
              {(() => {
                const { Icon, color } = getFileMeta(doc.filename)
                return <Icon className={cn('h-6 w-6 shrink-0', color)} />
              })()}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{doc.filename}</p>
                <div className="mt-0.5">
                  <StatusBadge status={doc.status} />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a document to start chatting</p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            onClick={onClear}
            variant="ghost"
            className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-primary/20 hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </Button>
          {!diagnosticsOpen && (
            <Button
              onClick={onOpenDiagnostics}
              variant="ghost"
              className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-primary/20 hover:text-foreground"
            >
              <PanelRightOpen className="h-3.5 w-3.5" />
              Diagnostics
            </Button>
          )}
        </div>
      </header>

      {/* Thread */}
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/25 ring-1 ring-primary/40">
                <Logo size="lg" showText={false} />
              </span>
              <h3 className="text-lg font-semibold text-foreground">
                Ask anything about {doc ? 'this document' : 'your documents'}
              </h3>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                Zen retrieves the most relevant passages and answers with page-level
                citations you can verify.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onCitationClick={onCitationClick} />
          ))}

          {waiting && (
            <div className="max-w-[78%]">
              <MessageSkeleton />
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-sidebar-border px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="glass-strong flex items-end gap-2 rounded-2xl p-2 transition-all duration-300 border border-transparent focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/20">
            <button
              onClick={onUploadClick}
              aria-label="Attach a document"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/20 hover:text-foreground"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Ask a question about your document…"
              className="scrollbar-thin max-h-32 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none"
            />

            <div className="flex shrink-0 flex-col items-end gap-1">
              {pending ? (
                <Button
                  onClick={onStop}
                  aria-label="Stop generating"
                  className="h-9 w-9 rounded-xl bg-destructive/20 p-0 text-destructive hover:bg-destructive/30"
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={submit}
                  disabled={!value.trim()}
                  aria-label="Send message"
                  className="h-9 w-9 rounded-xl bg-primary p-0 text-primary-foreground hover:bg-primary/80"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between px-1">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CornerDownLeft className="h-3 w-3" />
              Enter to send, Shift+Enter for a new line
            </span>
            <span
              className={cn(
                'text-[11px]',
                value.length > MAX_CHARS * 0.9 ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {value.length}/{MAX_CHARS}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
