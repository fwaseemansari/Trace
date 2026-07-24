'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Loader2, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setLoading(false)
      if (err?.response?.status === 403) {
        setError('Your email is not verified. Redirecting to verification...')
        setTimeout(() => {
          router.push(`/verify?email=${encodeURIComponent(email)}`)
        }, 1500)
      } else {
        setError('Invalid email or password. Please try again.')
      }
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
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
          />
        </div>
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
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
      </Button>
    </form>
  )
}
