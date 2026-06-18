import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { UserPublic } from '../../shared/auth'
import { fetchCurrentUser, signOut as apiSignOut } from '../lib/authApi'
import { setBillingAccountId } from '../lib/billingStorage'

interface AuthContextValue {
  user: UserPublic | null
  loading: boolean
  refresh: () => Promise<void>
  setUser: (user: UserPublic | null) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function applyUser(user: UserPublic | null) {
  if (user) {
    setBillingAccountId(user.billingAccountId)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState(true)

  const setUser = useCallback((next: UserPublic | null) => {
    applyUser(next)
    setUserState(next)
  }, [])

  const refresh = useCallback(async () => {
    const next = await fetchCurrentUser()
    setUser(next)
  }, [setUser])

  useEffect(() => {
    let cancelled = false
    void fetchCurrentUser()
      .then((next) => {
        if (!cancelled) setUser(next)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [setUser])

  const signOut = useCallback(async () => {
    await apiSignOut()
    setUser(null)
  }, [setUser])

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      setUser,
      signOut,
    }),
    [user, loading, refresh, setUser, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
