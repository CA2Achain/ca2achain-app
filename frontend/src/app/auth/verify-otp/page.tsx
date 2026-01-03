'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function VerifyOtpPage() {
  const router = useRouter()
  const { verifyOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'buyer' | 'dealer' | ''>('')
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load pending email and role from localStorage
    const pendingEmail = localStorage.getItem('pending_email')
    const pendingRole = localStorage.getItem('pending_role')
    
    if (pendingEmail) {
      setEmail(pendingEmail)
    }
    
    if (pendingRole) {
      setRole(pendingRole as 'buyer' | 'dealer')
    }

    if (!pendingEmail) {
      // No pending verification, redirect to login
      router.push('/auth/login')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (token.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setIsLoading(true)

    try {
      await verifyOtp(email, token)
      // verifyOtp handles redirect based on role
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Invalid or expired code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setToken(value)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">Verify Email</h1>

      <form onSubmit={handleSubmit} className="max-w-md border p-6">
        <h2 className="text-2xl mb-6">Enter Verification Code</h2>

        <p className="mb-6 text-sm text-gray-600">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>

        {error && (
          <div className="mb-4 p-3 border border-red-500 text-red-500">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block mb-2">
            6-Digit Code
          </label>
          <input
            type="text"
            value={token}
            onChange={handleTokenChange}
            required
            maxLength={6}
            className="w-full border p-2 text-2xl tracking-widest text-center"
            placeholder="000000"
            autoComplete="one-time-code"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || token.length !== 6}
          className="w-full border p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Verifying...' : 'Verify Code'}
        </button>

        <div className="mt-4 text-sm text-center text-gray-600">
          Didn't receive a code?{' '}
          <button
            type="button"
            onClick={() => router.push('/auth/login')}
            className="underline"
          >
            Try again
          </button>
        </div>
      </form>
    </div>
  )
}