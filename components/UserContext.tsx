'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { User } from '@/lib/types'

const PROFILE_CACHE_KEY = 'profile_cache'

interface UserContextType {
  user: User | null
  setUser: (u: User | null) => void
  profileLoading: boolean
}

const UserContext = createContext<UserContextType>({ user: null, setUser: () => {}, profileLoading: true })

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

  useEffect(() => {
    // Fetch in background — update UI when fresh data arrives
    fetch('/api/auth')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUserState(data.user)
          try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data.user)) } catch {}
        } else {
          try { localStorage.removeItem(PROFILE_CACHE_KEY) } catch {}
          setUserState(null)
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [])

  function setUser(u: User | null) {
    setUserState(u)
    if (u) {
      try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(u)) } catch {}
    } else {
      try { localStorage.removeItem(PROFILE_CACHE_KEY) } catch {}
    }
  }

  return <UserContext.Provider value={{ user, setUser, profileLoading }}>{children}</UserContext.Provider>
}

export const useUser = () => useContext(UserContext)
