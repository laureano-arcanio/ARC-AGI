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
  setUser: (id: number, email: string, role: string, token: string) => void
  clearUser: () => void
  isAdmin: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'authToken'
const USER_KEY = 'authUser'

type SavedUser = {
  token: string | null
  userId: number | null
  userEmail: string | null
  userRole: string | null
}

function readSaved(): SavedUser {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const raw = localStorage.getItem(USER_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { id: number; email: string; role: string }
      return { token, userId: parsed.id, userEmail: parsed.email, userRole: parsed.role }
    }
    return { token, userId: null, userEmail: null, userRole: null }
  } catch {
    return { token: null, userId: null, userEmail: null, userRole: null }
  }
}

function persist(token: string, userId: number, email: string, role: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify({ id: userId, email, role }))
  } catch {
    // storage unavailable
  }
}

function clear() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    // storage unavailable
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const saved = readSaved()
  const [userId, setUserIdState] = useState<number | null>(saved.userId)
  const [userEmail, setUserEmailState] = useState<string | null>(saved.userEmail)
  const [savedRole, setSavedRole] = useState<string | null>(saved.userRole)

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'user', userId],
    queryFn: () => http.get<UserRead>(`/v1/users/${userId}`),
    enabled: userId !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const setUser = useCallback((id: number, email: string, role: string, token: string) => {
    persist(token, id, email, role)
    setUserIdState(id)
    setUserEmailState(email)
    setSavedRole(role)
  }, [])

  const clearUser = useCallback(() => {
    clear()
    setUserIdState(null)
    setUserEmailState(null)
    setSavedRole(null)
  }, [])

  const resolvedEmail = user?.email ?? userEmail
  const isAdmin = (user?.role ?? savedRole) === 'admin'

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
