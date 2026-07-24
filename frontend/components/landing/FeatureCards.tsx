'use client'

import { motion } from 'motion/react'
import { FileText, MessagesSquare, Quote } from 'lucide-react'
import { GlassCard } from '@/components/shared/GlassCard'

const features = [
  {
    icon: FileText,
    title: 'Upload any document',
    body: 'PDF, DOCX, TXT, CSV, XLSX, MD or PPTX. Zen chunks and embeds your files so they are instantly searchable.',
  },
  {
    icon: MessagesSquare,
    title: 'AI-powered chat',
    body: 'Ask questions in plain language and get grounded, streaming answers from your own knowledge base.',
  },
  {
    icon: Quote,
    title: 'Source citations',
    body: 'Every answer links back to the exact file and page number, so you can verify every claim.',
  },
]

export function FeatureCards() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {features.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
        >
          <GlassCard tilt className="h-full p-6">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/25 ring-1 ring-primary/40">
              <f.icon className="h-5 w-5 text-foreground" />
            </span>
            <h3 className="mb-2 text-base font-semibold text-foreground">{f.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  )
}
