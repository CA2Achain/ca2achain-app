'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api/client'

export default function CallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract tokens from URL hash (Supabase puts them there)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (!accessToken) {
          setError('No authentication token found')
          return
        }

        // Store tokens
        localStorage.setItem('access_token', accessToken)
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken)
        }

        // Load user data to determine where to redirect
        const response = await apiClient.get('/auth/me')
        
        if (response.data.success) {
          const user = response.data.data
          
          // Redirect based on role and profile completion status
          if (user.role === 'buyer') {
            // Check if buyer has completed their profile
            if (user.account_data) {
              // Profile complete - go to profile page
              router.push('/buyer/profile')
            } else {
              // Profile NOT complete - go to complete-profile page
              router.push('/buyer/complete-profile')
            }
          } else if (user.role === 'dealer') {
            // Check if dealer has completed their profile
            if (user.account_data) {
              // Profile complete - go to profile page
              router.push('/dealer/profile')
            } else {
              // Profile NOT complete - go to complete-profile page
              router.push('/dealer/complete-profile')
            }
          } else {
            // No role or unknown role - go to homepage
            router.push('/')
          }
        } else {
          setError('Failed to load user data')
        }
        
      } catch (err: any) {
        console.error('Callback error:', err)
        setError(err.response?.data?.error || err.message || 'Authentication failed')
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="border p-6 border-red-500">
          <h2 className="text-2xl mb-4 text-red-600">Authentication Error</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="border px-4 py-2 hover:bg-gray-100"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="border p-6 text-center">
        <div className="mb-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
        <h2 className="text-2xl mb-2">Verifying...</h2>
        <p className="text-gray-600">Please wait while we authenticate your account.</p>
      </div>
    </div>
  )
}