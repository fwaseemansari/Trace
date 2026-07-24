'use client'

import { useState, type KeyboardEvent } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { DocumentSkeleton } from '@/components/shared/SkeletonLoader'
import { StatusBadge } from './StatusBadge'
import { getFileMeta } from './fileIcon'
import type { Document } from '@/types'
import { cn } from '@/lib/utils'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function DocumentList({
  documents,
  loading,
  selectedId,
  onSelect,
  onDelete,
  onRename,
}: {
  documents: Document[]
  loading: boolean
  selectedId: string | null
  onSelect: (doc: Document) => void
  onDelete: (id: string) => void
  onRename: (id: string, filename: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  function beginEdit(doc: Document) {
    setEditingId(doc.id)
    setDraft(doc.filename)
  }

  function commit(id: string) {
    if (draft.trim()) onRename(id, draft.trim())
    setEditingId(null)
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === 'Enter') commit(id)
    if (e.key === 'Escape') setEditingId(null)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <DocumentSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        No documents yet. Upload one to get started.
      </div>
    )
  }

  return (
    <ul className="space-y-1.5">
      {documents.map((doc) => {
        const { Icon, color } = getFileMeta(doc.filename)
        const selected = doc.id === selectedId
        const editing = editingId === doc.id
        return (
          <li key={doc.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => !editing && onSelect(doc)}
              onKeyDown={(e) => e.key === 'Enter' && !editing && onSelect(doc)}
              className={cn(
                'group relative flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-all',
                selected
                  ? 'border-secondary/50 bg-secondary/15'
                  : 'border-transparent hover:border-border hover:bg-primary/10',
              )}
            >
              <Icon className={cn('h-8 w-8 shrink-0', color)} />

              <div className="min-w-0 flex-1">
                {editing ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => onKey(e, doc.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full rounded-md border border-secondary/60 bg-[rgba(33,6,53,0.6)] px-1.5 py-0.5 text-sm text-foreground outline-none"
                  />
                ) : (
                  <p className="truncate text-sm font-medium text-foreground">{doc.filename}</p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={doc.status} />
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(doc.uploadedAt)}
                  </span>
                </div>
              </div>

              {editing ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      commit(doc.id)
                    }}
                    aria-label="Save name"
                    className="rounded-md p-1 text-success hover:bg-success/15"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingId(null)
                    }}
                    aria-label="Cancel"
                    className="rounded-md p-1 text-muted-foreground hover:bg-primary/20"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      beginEdit(doc)
                    }}
                    aria-label="Rename document"
                    className="rounded-md p-1 text-muted-foreground hover:bg-primary/20 hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(doc.id)
                    }}
                    aria-label="Delete document"
                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
