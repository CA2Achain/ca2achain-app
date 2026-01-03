'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const pendingEmail = localStorage.getItem('pending_email')
    if (pendingEmail) {
      setEmail(pendingEmail)
      localStorage.removeItem('pending_email')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login(email)
      setSuccess(true)
    } catch (err: any) {
      console.error('Login error:', err)
      
      const response = err.response?.data
      
      if (response?.error === 'USER_NOT_FOUND' || response?.redirect === '/auth/register') {
        setError('Account not found. Redirecting to registration...')
        setTimeout(() => {
          router.push('/auth/register')
        }, 2000)
      } else {
        setError(response?.message || err.message || 'Login failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="border p-6 max-w-md bg-green-50">
          <h2 className="text-2xl mb-4">✓ Check Your Email</h2>
          <p className="mb-4">
            We sent a login link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-600">
            Click the link in the email to sign in.
            The link will expire in 1 hour.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">Sign In</h1>

      <form onSubmit={handleSubmit} className="max-w-md border p-6">
        <h2 className="text-2xl mb-6">Login</h2>

        {error && (
          <div className="mb-4 p-3 border border-red-500 text-red-500">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border p-2"
            placeholder="your@email.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            We'll send you a magic link to sign in
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full border p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : 'Send Login Link'}
        </button>

        <div className="mt-4 text-sm text-center text-gray-600">
          Don't have an account?{' '}
          <a href="/auth/register" className="underline text-blue-600">
            Register
          </a>
        </div>
      </form>
    </div>
  )
}