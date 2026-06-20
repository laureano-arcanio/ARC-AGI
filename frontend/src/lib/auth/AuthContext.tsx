import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'
import { useUserByUuid } from '../../features/dashboard/queries'

type AuthContextType = {
  userUuid: string | null
  setUserUuid: (uuid: string) => void
  clearUserUuid: () => void
  isAdmin: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = 'currentUserUuid'

function readSavedUuid(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function persistUuid(uuid: string) {
  try {
    localStorage.setItem(STORAGE_KEY, uuid)
  } catch {
    // storage unavailable
  }
}

function removeUuid() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage unavailable
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userUuid, setUserUuidState] = useState<string | null>(readSavedUuid)

  const { data: user, isLoading } = useUserByUuid(userUuid ?? '')

  const setUserUuid = useCallback((uuid: string) => {
    persistUuid(uuid)
    setUserUuidState(uuid)
  }, [])

  const clearUserUuid = useCallback(() => {
    removeUuid()
    setUserUuidState(null)
  }, [])

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        userUuid,
        setUserUuid,
        clearUserUuid,
        isAdmin,
        isLoading: userUuid ? isLoading : false,
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
