import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { http } from '../http'

type UserRead = {
  id: number
  email: string
  role: string
}

type AuthContextType = {
  userId: number | null
  userEmail: string | null
  setUser: (id: number, email: string) => void
  clearUser: () => void
  isAdmin: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = 'currentUserId'

function readSavedId(): number | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY)
    return val ? Number(val) : null
  } catch {
    return null
  }
}

function persistId(id: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(id))
  } catch {
    // storage unavailable
  }
}

function removeId() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage unavailable
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<number | null>(readSavedId)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'user', userId],
    queryFn: () => http.get<UserRead>(`/v1/users/${userId}`),
    enabled: userId !== null,
    staleTime: 5 * 60 * 1000,
  })

  const setUser = useCallback((id: number, email: string) => {
    persistId(id)
    setUserIdState(id)
    setUserEmail(email)
  }, [])

  const clearUser = useCallback(() => {
    removeId()
    setUserIdState(null)
    setUserEmail(null)
  }, [])

  const resolvedEmail = user?.email ?? userEmail
  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        userId,
        userEmail: resolvedEmail,
        setUser,
        clearUser,
        isAdmin,
        isLoading: userId !== null ? isLoading : false,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
