'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as api from '@/lib/api'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  verify: (code: string, email?: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const USER_KEY = 'zen_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Rehydrate from localStorage on mount.
  useEffect(() => {
    const t = api.getToken()
    const rawUser = typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null
    if (t) setTokenState(t)
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser))
      } catch {
        /* ignore */
      }
    }
    setLoading(false)
  }, [])

  const persist = useCallback((t: string, u: User) => {
    api.setToken(t)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setTokenState(t)
    setUser(u)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password)
      persist(res.token, res.user)
    },
    [persist],
  )

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await api.register(email, password)
      persist(res.token, res.user)
    },
    [persist],
  )

  const verify = useCallback(async (code: string, email?: string) => {
    const res = await api.verify(code, email)
    return res.ok
  }, [])

  const logout = useCallback(() => {
    api.clearToken()
    localStorage.removeItem(USER_KEY)
    setTokenState(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, token, loading, login, register, verify, logout }),
    [user, token, loading, login, register, verify, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
