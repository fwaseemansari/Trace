'use client'

import { useCallback, useRef, useState, type DragEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, FileSpreadsheet, FileText, FileType, Presentation, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Phase = 'idle' | 'uploading' | 'embedding' | 'ready' | 'error'

const ACCEPTED = '.pdf,.docx,.txt,.md,.csv,.pptx,.xlsx'

const TYPE_ICONS = [
  { Icon: FileType, label: 'PDF' },
  { Icon: FileText, label: 'DOCX' },
  { Icon: FileText, label: 'TXT' },
  { Icon: FileText, label: 'MD' },
  { Icon: FileSpreadsheet, label: 'CSV' },
  { Icon: FileSpreadsheet, label: 'XLSX' },
  { Icon: Presentation, label: 'PPTX' },
]

export function UploadModal({
  open,
  onClose,
  onUpload,
}: {
  open: boolean
  onClose: () => void
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<unknown>
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setPhase('idle')
    setProgress(0)
    setFileName('')
    setDragOver(false)
  }, [])

  const handleClose = useCallback(() => {
    if (phase === 'uploading' || phase === 'embedding') return
    reset()
    onClose()
  }, [phase, reset, onClose])

  const start = useCallback(
    async (file: File) => {
      setFileName(file.name)
      setPhase('uploading')
      setProgress(0)
      try {
        await onUpload(file, (pct) => {
          setProgress(pct)
          if (pct >= 100) setPhase('embedding')
        })
        setPhase('ready')
        setTimeout(handleClose, 1200)
      } catch {
        setPhase('error')
      }
    },
    [onUpload, handleClose],
  )

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) start(file)
  }

  const busy = phase === 'uploading' || phase === 'embedding'
  const phaseLabel =
    phase === 'uploading' ? 'Uploading' : phase === 'embedding' ? 'Generating embeddings' : 'Ready'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Upload document"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="glass-strong relative z-10 w-full max-w-lg rounded-2xl p-6"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Upload a document</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Add a file to your knowledge base.
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={busy}
                aria-label="Close"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/20 hover:text-foreground disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {phase === 'idle' && (
              <>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={cn(
                    'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
                    dragOver
                      ? 'border-secondary bg-secondary/10'
                      : 'border-border bg-[rgba(66,13,75,0.25)] hover:border-secondary/60',
                  )}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/25 ring-1 ring-primary/40">
                    <UploadCloud className="h-6 w-6 text-foreground" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    Drag &amp; drop or click to browse
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PDF, DOCX, TXT, CSV, XLSX, MD or PPTX up to 15MB
                  </span>
                </button>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  {TYPE_ICONS.map((t, i) => (
                    <div
                      key={`${t.label}-${i}`}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-[rgba(66,13,75,0.3)] px-2.5 py-1.5 text-xs text-muted-foreground"
                    >
                      <t.Icon className="h-3.5 w-3.5" />
                      {t.label}
                    </div>
                  ))}
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) start(file)
                  }}
                />
              </>
            )}

            {busy && (
              <div className="space-y-5 py-2">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-[rgba(66,13,75,0.3)] p-3">
                  <FileType className="h-8 w-8 text-secondary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{phaseLabel}…</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{progress}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[rgba(102,103,171,0.2)]">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    animate={{ width: `${phase === 'embedding' ? 100 : progress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <StepDot active label="Uploading" done={phase === 'embedding'} />
                  <span className="text-border">→</span>
                  <StepDot active={phase === 'embedding'} label="Embeddings" done={false} />
                  <span className="text-border">→</span>
                  <StepDot active={false} label="Ready" done={false} />
                </div>
              </div>
            )}

            {phase === 'ready' && (
              <div className="flex flex-col items-center gap-3 py-6">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/20 ring-1 ring-success/40">
                  <Check className="h-7 w-7 text-success" />
                </span>
                <p className="text-sm font-medium text-foreground">Uploaded successfully</p>
              </div>
            )}

            {phase === 'error' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <p className="text-sm text-destructive">Upload failed. Please try again.</p>
                <Button
                  onClick={reset}
                  className="h-9 rounded-lg bg-primary px-4 text-primary-foreground hover:bg-primary/80"
                >
                  Try again
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span
      className={cn(
        'flex items-center gap-1.5',
        active || done ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          done ? 'bg-success' : active ? 'bg-primary' : 'bg-[rgba(102,103,171,0.3)]',
        )}
      />
      {label}
    </span>
  )
}
