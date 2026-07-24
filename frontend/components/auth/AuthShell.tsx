'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { Logo } from '@/components/shared/Logo'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <GlassCard strong className="p-7 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </GlassCard>
        {footer && (
          <p className="mt-5 text-center text-sm text-muted-foreground">{footer}</p>
        )}
      </motion.div>
    </main>
  )
}
