'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { storeTokensAndRedirect } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract tokens from URL hash
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (!accessToken) {
          setError('Invalid authentication link. Please try again.')
          return
        }

        // Store tokens and load user (redirect happens automatically)
        await storeTokensAndRedirect(accessToken, refreshToken || undefined)
        
      } catch (err: any) {
        console.error('Callback error:', err)
        setError(err.message || 'Authentication failed. Please try again.')
      }
    }

    handleCallback()
  }, [storeTokensAndRedirect])

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="border border-red-500 p-6 text-center">
          <h1 className="text-2xl mb-4 text-red-500">Authentication Error</h1>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => router.push('/auth/register')}
            className="border px-4 py-2 hover:bg-gray-100"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="border p-6 text-center">
        <h1 className="text-2xl mb-4">Verifying...</h1>
        <p>Please wait while we authenticate your account.</p>
      </div>
    </div>
  )
}