import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export function Logo({
  className,
  showText = true,
  size = 'md',
}: {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const containerSize = size === 'sm' ? 'h-6 w-6 rounded-lg' : size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-9 w-9 rounded-xl'
  const svgSize = size === 'sm' ? '14' : size === 'lg' ? '24' : '20'

  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <div className={cn('relative flex items-center justify-center bg-primary/20 ring-1 ring-primary/30 overflow-hidden', containerSize)}>
        {/* Background glow orb inside logo */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-secondary/30 blur-sm" />
        
        <motion.svg
          width={svgSize}
          height={svgSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative z-10 text-foreground"
        >
          {/* Document/Retrieval source layers */}
          <motion.rect
            x="3"
            y="3"
            width="12"
            height="12"
            rx="2"
            animate={{
              y: [3, 2, 3],
              x: [3, 4, 3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            stroke="currentColor"
            className="opacity-70"
          />
          {/* Search/Query element */}
          <motion.circle
            cx="15"
            cy="15"
            r="4"
            className="text-secondary"
            animate={{
              scale: [1, 1.15, 1],
              strokeWidth: [2.5, 3.5, 2.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          {/* Query search line */}
          <motion.line
            x1="18"
            y1="18"
            x2="21"
            y2="21"
            className="text-secondary"
            animate={{
              strokeWidth: [2.5, 3.5, 2.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          {/* Glowing generation node */}
          <motion.circle
            cx="9"
            cy="9"
            r="1.5"
            fill="currentColor"
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.svg>
 
        {/* Vertical scan ray */}
        <motion.div
          className="absolute inset-x-0 h-[1.5px] bg-secondary/80 blur-[0.5px]"
          animate={{
            top: ["0%", "100%", "0%"]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
      {showText && (
        <span className={cn(
          "font-bold tracking-tight text-foreground bg-gradient-to-r from-foreground via-foreground to-secondary bg-clip-text text-transparent",
          size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg'
        )}>
          Zen
        </span>
      )}
    </div>
  )
}
