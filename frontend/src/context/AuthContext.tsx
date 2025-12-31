'use client'

import { createContext, useContext, ReactNode } from 'react'

interface AuthContextType {
  // TODO: Define auth context shape
  user: null
  isAuthenticated: boolean
  role: null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // TODO: Implement auth provider logic
  
  const value = {
    user: null,
    isAuthenticated: false,
    role: null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
