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
    const saved = localStorage.getItem('kalori_user')
    if (saved) setUserState(JSON.parse(saved))
  }, [])

  function setUser(u: User | null) {
    setUserState(u)
    if (u) localStorage.setItem('kalori_user', JSON.stringify(u))
    else localStorage.removeItem('kalori_user')
  }

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>
}

export const useUser = () => useContext(UserContext)
