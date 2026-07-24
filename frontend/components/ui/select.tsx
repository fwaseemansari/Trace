'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  hint?: string
}

export function Select({
  value,
  options,
  onChange,
  className,
  ariaLabel,
}: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  className?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-border bg-[rgba(66,13,75,0.4)] px-2.5 text-xs font-medium text-foreground outline-none transition-colors hover:border-secondary/60 focus:ring-2 focus:ring-primary/30"
      >
        <span className="truncate">{current?.label ?? 'Select'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="glass-strong absolute z-50 mt-1.5 max-h-64 w-full min-w-max overflow-auto rounded-xl p-1 shadow-xl"
          >
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                    o.value === value
                      ? 'bg-secondary/25 text-foreground'
                      : 'text-muted-foreground hover:bg-primary/20 hover:text-foreground',
                  )}
                >
                  <span className="flex flex-col">
                    <span className="font-medium text-foreground">{o.label}</span>
                    {o.hint && <span className="text-[11px] text-muted-foreground">{o.hint}</span>}
                  </span>
                  {o.value === value && <Check className="h-3.5 w-3.5 text-secondary" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
