'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: 'easeInOut', duration: 0.35 }}
    >
      {children}
    </motion.div>
  )
}
