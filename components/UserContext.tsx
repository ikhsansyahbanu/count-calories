'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { User } from '@/lib/types'

const PROFILE_CACHE_KEY = 'profile_cache'

interface UserContextType {
  user: User | null
  setUser: (u: User | null) => void
  profileLoading: boolean
  authenticated: boolean
  authChecked: boolean
  refreshAuth: () => void
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  profileLoading: true,
  authenticated: false,
  authChecked: false,
  refreshAuth: () => {},
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Hydrate instantly from localStorage (stale-while-revalidate)
  const [user, setUserState] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY)
      return cached ? (JSON.parse(cached) as User) : null
    } catch {
      return null
    }
  })
  const [profileLoading, setProfileLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  const refreshAuth = useCallback(() => {
    setProfileLoading(true)
    fetch('/api/auth')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUserState(data.user)
          setAuthenticated(true)
          try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data.user)) } catch {}
        } else {
          try { localStorage.removeItem(PROFILE_CACHE_KEY) } catch {}
          setUserState(null)
          setAuthenticated(false)
        }
      })
      .catch(() => {
        setAuthenticated(false)
      })
      .finally(() => {
        setProfileLoading(false)
        setAuthChecked(true)
      })
  }, [])

  useEffect(() => { refreshAuth() }, [refreshAuth])

  function setUser(u: User | null) {
    setUserState(u)
    if (u) {
      setAuthenticated(true)
      try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(u)) } catch {}
    } else {
      setAuthenticated(false)
      try { localStorage.removeItem(PROFILE_CACHE_KEY) } catch {}
    }
  }

  return (
    <UserContext.Provider value={{ user, setUser, profileLoading, authenticated, authChecked, refreshAuth }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
