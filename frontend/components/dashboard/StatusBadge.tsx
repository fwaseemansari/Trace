import { Loader2 } from 'lucide-react'
import type { DocumentStatus } from '@/types'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }: { status: DocumentStatus }) {
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success ring-1 ring-success/30">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Ready
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive ring-1 ring-destructive/30">
        Error
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-medium text-secondary ring-1 ring-secondary/30',
      )}
    >
      <Loader2 className="h-2.5 w-2.5 animate-spin" />
      Processing
    </span>
  )
}
