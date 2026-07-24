'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { FeatureCards } from '@/components/landing/FeatureCards'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh">

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            variant="ghost"
            className="h-9 px-4 text-foreground hover:bg-primary/20"
          >
            Sign In
          </Button>
          <Button
            render={<Link href="/register" />}
            nativeButton={false}
            className="h-9 bg-primary px-4 text-primary-foreground hover:bg-primary/80"
          >
            Get Started
          </Button>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-16 pt-16 text-center md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-[rgba(66,13,75,0.4)] px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-secondary" />
          Retrieval Augmented Generation, done right
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-6xl"
        >
          Chat with your documents intelligently
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          Zen turns your files into a searchable knowledge base. Upload anything, ask
          questions, and get answers grounded in real sources with page-level citations.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button
            render={<Link href="/register" />}
            nativeButton={false}
            className="h-12 gap-2 rounded-xl bg-primary px-7 text-sm text-primary-foreground shadow-[0_8px_30px_-8px_rgba(123,51,126,0.8)] hover:bg-primary/80"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            variant="outline"
            className="h-12 rounded-xl border-border bg-[rgba(66,13,75,0.3)] px-7 text-sm text-foreground backdrop-blur-sm hover:bg-primary/20"
          >
            Sign In
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-20 w-full"
        >
          <div className="mb-8 flex flex-col items-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Everything you need to reason over your files
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              A focused workspace built for grounded, verifiable answers.
            </p>
          </div>
          <FeatureCards />
        </motion.div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-10 text-center text-xs text-muted-foreground/70">
        Built for grounded AI. Zen &copy; {new Date().getFullYear()}
      </footer>
    </main>
  )
}
