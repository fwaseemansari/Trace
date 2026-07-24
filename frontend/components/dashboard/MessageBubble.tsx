'use client'

import { motion } from 'motion/react'
import { Quote } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import type { ChatMessage, Citation } from '@/types'
import { cn } from '@/lib/utils'

export function MessageBubble({
  message,
  onCitationClick,
}: {
  message: ChatMessage
  onCitationClick?: (citation: Citation) => void
}) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1',
          isUser
            ? 'bg-secondary/25 ring-secondary/40'
            : 'bg-primary/25 ring-primary/40',
        )}
      >
        {isUser ? (
          <span className="text-xs font-semibold text-foreground">You</span>
        ) : (
          <Logo size="sm" showText={false} />
        )}
      </span>

      <div className={cn('flex max-w-[78%] flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'rounded-tr-sm bg-secondary/25 text-foreground'
              : 'glass rounded-tl-sm text-foreground',
          )}
        >
          {message.content}
          {message.streaming && (
            <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-primary animate-caret" />
          )}
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.citations.map((c) => (
              <button
                key={c.id}
                onClick={() => onCitationClick?.(c)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-[rgba(66,13,75,0.4)] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-secondary/60 hover:text-foreground"
              >
                <Quote className="h-3 w-3 text-secondary" />
                <span className="max-w-[180px] truncate">{c.filename}</span>
                <span className="text-secondary">(page {c.page})</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
