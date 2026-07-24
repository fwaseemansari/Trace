import { Tilt } from 'react-tilt'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: ReactNode
  className?: string
  /** Enable a subtle 3D hover tilt. */
  tilt?: boolean
  strong?: boolean
}

export function GlassCard({ children, className, tilt = false, strong = false }: GlassCardProps) {
  const cardContent = (
    <div
      className={cn(
        strong ? 'glass-strong' : 'glass',
        'rounded-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]',
        className,
      )}
    >
      {children}
    </div>
  )

  if (tilt) {
    return (
      <Tilt options={{ max: 15, scale: 1.015, speed: 600, perspective: 1000 }} className="h-full">
        {cardContent}
      </Tilt>
    )
  }

  return cardContent
}
