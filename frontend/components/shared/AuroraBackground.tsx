import { cn } from '@/lib/utils'

/**
 * Slow-moving aurora / mesh gradient blobs rendered behind ALL content.
 * Placed in root layout — no need to add per-page anymore.
 */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("fixed inset-0 overflow-hidden pointer-events-none", className)}
      style={{
        zIndex: 1,
        background: 'radial-gradient(ellipse at 50% 0%, var(--background) 0%, #150224 55%, #0d0118 100%)',
      }}
    >
      {/* Purple blob — top left */}
      <div
        className="absolute animate-aurora-a rounded-full"
        style={{
          top: '-10%',
          left: '-5%',
          width: '60vw',
          height: '60vw',
          background: 'radial-gradient(circle, var(--aurora-1) 0%, transparent 70%)',
          opacity: 0.55,
          filter: 'blur(80px)',
        }}
      />
      {/* Indigo blob — top right */}
      <div
        className="absolute animate-aurora-b rounded-full"
        style={{
          top: '5%',
          right: '-10%',
          width: '55vw',
          height: '55vw',
          background: 'radial-gradient(circle, var(--aurora-2) 0%, transparent 70%)',
          opacity: 0.5,
          filter: 'blur(90px)',
        }}
      />
      {/* Deep purple blob — bottom center */}
      <div
        className="absolute animate-aurora-c rounded-full"
        style={{
          bottom: '-15%',
          left: '20%',
          width: '65vw',
          height: '65vw',
          background: 'radial-gradient(circle, var(--aurora-3) 0%, transparent 70%)',
          opacity: 0.45,
          filter: 'blur(100px)',
        }}
      />
      {/* Small accent — bottom right */}
      <div
        className="absolute rounded-full"
        style={{
          bottom: '10%',
          right: '10%',
          width: '35vw',
          height: '35vw',
          background: 'radial-gradient(circle, var(--aurora-2) 0%, transparent 70%)',
          opacity: 0.35,
          filter: 'blur(70px)',
          animation: 'aurora-b 18s ease-in-out infinite reverse',
        }}
      />
      {/* Vignette darkens the center so text is always readable */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(33,6,53,0.7) 100%)',
        }}
      />
    </div>
  )
}
