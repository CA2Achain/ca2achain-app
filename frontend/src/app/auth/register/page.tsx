'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'buyer' | 'dealer' | ''>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!role) {
      setError('Please select if you are a buyer or dealer')
      return
    }

    setIsLoading(true)

    try {
      await register(email, role)
      setSuccess(true)
    } catch (err: any) {
      console.error('Registration error:', err)
      
      const response = err.response?.data
      
      // Check for EXISTING_USER error code
      if (response?.error === 'EXISTING_USER' || response?.redirect === '/auth/login') {
        setError('Account already exists. Redirecting to login...')
        // Store email for login page
        localStorage.setItem('pending_email', email)
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      } else {
        setError(response?.message || err.message || 'Registration failed')
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
            We sent a verification link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-600">
            Click the link in the email to verify your account and get started.
            The link will expire in 1 hour.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">Create Account</h1>

      <form onSubmit={handleSubmit} className="max-w-md border p-6">
        <h2 className="text-2xl mb-6">Register</h2>

        {error && (
          <div className="mb-4 p-3 border border-red-500 text-red-500">
            {error}
          </div>
        )}

        <div className="mb-4">
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
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium">
            I am a:
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="role"
                value="buyer"
                checked={role === 'buyer'}
                onChange={() => setRole('buyer')}
                className="mr-2"
              />
              Buyer - I want to verify my age/address
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="role"
                value="dealer"
                checked={role === 'dealer'}
                onChange={() => setRole('dealer')}
                className="mr-2"
              />
              Dealer - I need to verify customer information
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email || !role}
          className="w-full border p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Send Verification Link'}
        </button>

        <div className="mt-4 text-sm text-center text-gray-600">
          Already have an account?{' '}
          <a href="/auth/login" className="underline text-blue-600">
            Sign in
          </a>
        </div>
      </form>
    </div>
  )
}