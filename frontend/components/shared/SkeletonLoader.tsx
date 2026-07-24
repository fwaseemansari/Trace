import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[rgba(102,103,171,0.18)]',
        className,
      )}
    />
  )
}

export function DocumentSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
      <Skeleton className="h-9 w-9 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
    </div>
  )
}

export function MessageSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}
