'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Loader2, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

function scorePassword(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score // 0..4
}

const STRENGTH = [
  { label: 'Too weak', color: 'bg-destructive' },
  { label: 'Weak', color: 'bg-destructive' },
  { label: 'Fair', color: 'bg-secondary' },
  { label: 'Good', color: 'bg-secondary' },
  { label: 'Strong', color: 'bg-success' },
]

export function RegisterForm() {
  const router = useRouter()
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const score = useMemo(() => scorePassword(password), [password])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (score < 2) {
      setError('Please choose a stronger password.')
      return
    }
    setLoading(true)
    try {
      await register(email, password)
      router.push('/verify')
    } catch {
      setError('Could not create your account. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
          />
        </div>

        {password.length > 0 && (
          <div className="pt-1">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    i < score ? STRENGTH[score].color : 'bg-[rgba(102,103,171,0.2)]',
                  )}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Password strength: <span className="text-foreground">{STRENGTH[score].label}</span>
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/80"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
      </Button>
    </form>
  )
}
