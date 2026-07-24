'use client'

import { useRouter } from 'next/navigation'
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const LENGTH = 6

export function VerifyForm() {
  const router = useRouter()
  const { verify } = useAuth()
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(30)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function setDigit(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = char
      return next
    })
    if (char && index < LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!pasted) return
    const next = Array(LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    inputs.current[Math.min(pasted.length, LENGTH - 1)]?.focus()
  }

  async function submit() {
    const code = digits.join('')
    if (code.length < LENGTH) {
      setError('Please enter all 6 digits.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const email = urlParams.get('email') || ''
      const ok = await verify(code, email)
      setLoading(false)
      if (ok) {
        setSuccess(true)
        setTimeout(() => router.push('/dashboard'), 1100)
      } else {
        setError('That code is invalid. Please try again.')
      }
    } catch (err: any) {
      setLoading(false)
      setError(err?.response?.data?.detail || 'An error occurred during verification.')
    }
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20 ring-1 ring-success/40">
              <Check className="h-8 w-8 text-success" />
            </span>
            <p className="text-sm font-medium text-foreground">Verified! Redirecting…</p>
          </motion.div>
        ) : (
          <motion.div key="form" className="space-y-6">
            <div className="flex justify-center gap-2 sm:gap-3" onPaste={onPaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el
                  }}
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={cn(
                    'h-13 w-11 rounded-xl border bg-[rgba(66,13,75,0.4)] text-center text-lg font-semibold text-foreground backdrop-blur-sm outline-none transition-all sm:h-14 sm:w-12',
                    d ? 'border-secondary' : 'border-border',
                    'focus:border-primary/70 focus:ring-4 focus:ring-primary/20',
                  )}
                />
              ))}
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-sm text-destructive"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <Button
              onClick={submit}
              disabled={loading}
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/80"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify email'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {countdown > 0 ? (
                <span>
                  Resend code in <span className="text-foreground">{countdown}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCountdown(30)
                    setDigits(Array(LENGTH).fill(''))
                    inputs.current[0]?.focus()
                  }}
                  className="font-medium text-secondary hover:underline"
                >
                  Resend code
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
