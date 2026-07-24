'use client'

import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, PanelRightClose } from 'lucide-react'
import type { RetrievalDiagnostics } from '@/types'
import { cn } from '@/lib/utils'

export function DiagnosticsPanel({
  diagnostics,
  onClose,
}: {
  diagnostics: RetrievalDiagnostics | null
  onClose: () => void
}) {
  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-sidebar-border bg-sidebar backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="text-sm font-semibold text-foreground">Retrieval Diagnostics</h2>
        <button
          onClick={onClose}
          aria-label="Hide diagnostics panel"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/20 hover:text-foreground"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto px-3 pb-4">
        {!diagnostics ? (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            Ask a question to inspect the retrieval pipeline — query rewriting, retrieved
            chunks, and the context sent to the model.
          </p>
        ) : (
          <>
            <Section title="Original Query" defaultOpen>
              <p className="text-xs leading-relaxed text-foreground">{diagnostics.originalQuery}</p>
            </Section>

            <Section title="Rewritten Query" defaultOpen>
              <RewrittenQueryDiff
                original={diagnostics.originalQuery}
                rewritten={diagnostics.rewrittenQuery}
              />
              {diagnostics.rewrittenQuery !== diagnostics.originalQuery && (
                <span className="mt-2 inline-block rounded-md bg-secondary/20 px-1.5 py-0.5 text-[10px] text-secondary">
                  expanded for retrieval
                </span>
              )}
            </Section>

            <Section title={`Retrieved Chunks (${diagnostics.chunks.length})`} defaultOpen>
              <div className="space-y-2">
                {diagnostics.chunks.map((c, i) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-border bg-[rgba(33,6,53,0.4)] p-2.5"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-medium text-foreground">
                        [{i + 1}] {c.source}
                      </span>
                      <span className="shrink-0 rounded bg-primary/25 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                        {c.score.toFixed(3)}
                      </span>
                    </div>
                    <p className="mb-1 text-[10px] text-secondary">page {c.page}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{c.text}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Context sent to LLM">
              <TruncatedText text={diagnostics.context} />
            </Section>

            <Section title="Final Answer">
              <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                {diagnostics.answer}
              </p>
            </Section>
          </>
        )}
      </div>
    </aside>
  )
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[rgba(66,13,75,0.25)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-3 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TruncatedText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > 220
  const shown = expanded || !isLong ? text : text.slice(0, 220) + '…'
  return (
    <div>
      <p className="text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
        {shown}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 text-[11px] font-medium text-secondary hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

function diffWords(original: string, rewritten: string) {
  const oldWords = original.trim().split(/\s+/).filter(Boolean)
  const newWords = rewritten.trim().split(/\s+/).filter(Boolean)

  const dp: number[][] = Array(oldWords.length + 1)
    .fill(null)
    .map(() => Array(newWords.length + 1).fill(0))

  for (let i = 1; i <= oldWords.length; i++) {
    for (let j = 1; j <= newWords.length; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const result: { type: 'added' | 'removed' | 'common'; text: string }[] = []
  let i = oldWords.length
  let j = newWords.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ type: 'common', text: oldWords[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: newWords[j - 1] })
      j--
    } else {
      result.unshift({ type: 'removed', text: oldWords[i - 1] })
      i--
    }
  }
  return result
}

function RewrittenQueryDiff({ original, rewritten }: { original: string; rewritten: string }) {
  const diff = diffWords(original, rewritten)
  return (
    <div className="text-xs leading-relaxed text-foreground flex flex-wrap gap-x-1 gap-y-0.5">
      {diff.map((chunk, index) => {
        if (chunk.type === 'added') {
          return (
            <ins
              key={index}
              className="bg-success/20 text-success no-underline border border-success/30 px-1 rounded font-medium inline-block"
            >
              {chunk.text}
            </ins>
          )
        }
        if (chunk.type === 'removed') {
          return (
            <del
              key={index}
              className="line-through text-destructive bg-destructive/15 px-1 rounded border border-destructive/20 inline-block"
            >
              {chunk.text}
            </del>
          )
        }
        return <span key={index} className="text-foreground inline-block">{chunk.text}</span>
      })}
    </div>
  )
}
