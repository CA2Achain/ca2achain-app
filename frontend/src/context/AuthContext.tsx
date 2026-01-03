'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api/client'

interface User {
  id: string
  email: string
  role: 'buyer' | 'dealer' | null
  account_data: any | null
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string) => Promise<void>
  register: (email: string, role: 'buyer' | 'dealer') => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isLoadingUser = useRef(false) // Prevent concurrent loadUser calls

  const loadUser = useCallback(async () => {
    // Prevent concurrent calls
    if (isLoadingUser.current) {
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) {
      setIsLoading(false)
      return
    }

    isLoadingUser.current = true

    try {
      const response = await apiClient.get('/auth/me')
      if (response.data.success) {
        setUser(response.data.data)
      }
    } catch (error) {
      console.error('Load user error:', error)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
    } finally {
      setIsLoading(false)
      isLoadingUser.current = false
    }
  }, []) // Empty deps - this function never changes

  // Load user ONCE on mount
  useEffect(() => {
    loadUser()
  }, [loadUser])

  const register = async (email: string, role: 'buyer' | 'dealer') => {
    const response = await apiClient.post('/auth/register', { email, role })
    if (!response.data.success) {
      throw new Error(response.data.error || 'Registration failed')
    }
  }

  const login = async (email: string) => {
    const response = await apiClient.post('/auth/login', { email })
    if (!response.data.success) {
      throw new Error(response.data.error || 'Login failed')
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    router.push('/')
  }

  const refreshUser = async () => {
    await loadUser()
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}