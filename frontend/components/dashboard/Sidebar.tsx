'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/shared/Logo'
import { DocumentList } from './DocumentList'
import { useAuth } from '@/hooks/useAuth'
import type { Document } from '@/types'

export function Sidebar({
  documents,
  loading,
  selectedId,
  onSelect,
  onDelete,
  onRename,
  onUploadClick,
}: {
  documents: Document[]
  loading: boolean
  selectedId: string | null
  onSelect: (doc: Document) => void
  onDelete: (id: string) => void
  onRename: (id: string, filename: string) => void
  onUploadClick: () => void
}) {
  const router = useRouter()
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const initial = (user?.email?.[0] ?? 'U').toUpperCase()

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar backdrop-blur-xl">
      <div className="flex items-center px-5 py-5">
        <Logo />
      </div>

      <div className="px-4">
        <Button
          onClick={onUploadClick}
          className="h-10 w-full gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/80"
        >
          <Plus className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      <div className="mt-5 px-4 pb-2">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Documents
        </p>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-4">
        <DocumentList
          documents={documents}
          loading={loading}
          selectedId={selectedId}
          onSelect={onSelect}
          onDelete={onDelete}
          onRename={onRename}
        />
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/25 text-sm font-semibold text-foreground ring-1 ring-secondary/40">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.email ?? 'Guest user'}
            </p>
            <p className="text-[11px] text-muted-foreground">Free plan</p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
