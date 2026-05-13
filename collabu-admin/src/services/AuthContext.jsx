import { createContext, useContext, useState, useCallback } from 'react'
import { getAdminUser, setAdminUser, setToken, clearToken } from '../services/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => getAdminUser())

  const login = useCallback((token, user) => {
    setToken(token)
    setAdminUser(user)
    setAdmin(user)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setAdmin(null)
  }, [])

  return <AuthCtx.Provider value={{ admin, login, logout }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
