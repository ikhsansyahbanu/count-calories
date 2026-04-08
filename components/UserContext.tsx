'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { User } from '@/lib/types'

interface UserContextType {
  user: User | null
  setUser: (u: User | null) => void
}

const UserContext = createContext<UserContextType>({ user: null, setUser: () => {} })

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)

  useEffect(() => {
    // Load user dari session (bukan localStorage)
    fetch('/api/auth')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.user) setUserState(data.user)
      })
      .catch(() => {})
  }, [])

  function setUser(u: User | null) {
    setUserState(u)
  }

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>
}

export const useUser = () => useContext(UserContext)
