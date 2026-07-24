import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-xl border border-border bg-[rgba(66,13,75,0.35)] px-3.5 text-sm text-foreground',
          'placeholder:text-muted-foreground/70 backdrop-blur-sm transition-all outline-none',
          'focus:border-primary/70 focus:ring-4 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)
