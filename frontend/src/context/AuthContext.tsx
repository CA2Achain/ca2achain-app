'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import apiClient from '@/lib/api/client'

interface User {
  id: string
  email: string
  role: 'buyer' | 'dealer' | null
  account_data: any | null
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string) => Promise<void>
  register: (email: string, role: 'buyer' | 'dealer') => Promise<void>
  verifyOtp: (email: string, token: string) => Promise<void>
  storeTokensAndRedirect: (accessToken: string, refreshToken?: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Load user on mount
  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      const response = await apiClient.get('/auth/me')
      if (response.data.success) {
        setUser(response.data.data)
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, role: 'buyer' | 'dealer') => {
    const response = await apiClient.post('/auth/register', { email, role })
    if (!response.data.success) {
      throw new Error(response.data.error || 'Registration failed')
    }
    // Store email for display on next page
    localStorage.setItem('pending_email', email)
  }

  const login = async (email: string) => {
    const response = await apiClient.post('/auth/login', { email })
    if (!response.data.success) {
      throw new Error(response.data.error || 'Login failed')
    }
    // Store email for OTP verification
    localStorage.setItem('pending_email', email)
  }

  const verifyOtp = async (email: string, token: string) => {
    const response = await apiClient.post('/auth/verify-otp', { 
      email, 
      token
    })
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Verification failed')
    }

    const { access_token, refresh_token, role, user: userData } = response.data.data

    // Store tokens
    localStorage.setItem('auth_token', access_token)
    if (refresh_token) {
      localStorage.setItem('refresh_token', refresh_token)
    }

    // Clear pending email
    localStorage.removeItem('pending_email')

    // Set user state
    setUser({
      id: userData.id,
      email: userData.email,
      role: role,
      account_data: null
    })

    // Redirect based on role
    if (role === 'buyer') {
      router.push('/buyer/complete-profile')
    } else if (role === 'dealer') {
      router.push('/dealer/complete-profile')
    }
  }

  const storeTokensAndRedirect = async (accessToken: string, refreshToken?: string) => {
    try {
      // Store tokens
      localStorage.setItem('auth_token', accessToken)
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken)
      }

      // Clear pending email
      localStorage.removeItem('pending_email')

      // Load user to get role
      await loadUser()

      // Redirect will happen via useEffect when user is loaded
    } catch (error: any) {
      console.error('Token storage error:', error)
      throw error
    }
  }

  // Auto-redirect after magic link authentication
  useEffect(() => {
    if (user && user.role) {
      // Check if user has completed profile
      if (!user.account_data) {
        if (user.role === 'buyer') {
          router.push('/buyer/complete-profile')
        } else if (user.role === 'dealer') {
          router.push('/dealer/complete-profile')
        }
      }
    }
  }, [user])

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('pending_email')
    setUser(null)
    router.push('/auth/login')
  }

  const refreshUser = async () => {
    await loadUser()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verifyOtp,
        storeTokensAndRedirect,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}