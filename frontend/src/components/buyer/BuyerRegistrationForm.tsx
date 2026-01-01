'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/button'
import { buyerApi } from '@/lib/api/buyer'
import type { BuyerRegistration } from '@ca2achain/shared'

export default function BuyerRegistrationForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<BuyerRegistration>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await buyerApi.register(formData)
      
      if (result.success) {
        // Registration successful, redirect to verification
        router.push('/buyer/verify-identity')
      } else {
        setError(result.error || 'Registration failed')
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md border p-6">
      <h2 className="text-2xl mb-6">Buyer Registration</h2>

      {error && (
        <div className="mb-4 p-3 border border-red-500 text-red-500">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="first_name" className="block mb-2">
          First Name *
        </label>
        <input
          id="first_name"
          name="first_name"
          type="text"
          value={formData.first_name}
          onChange={handleChange}
          required
          minLength={1}
          className="border p-2 w-full"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="last_name" className="block mb-2">
          Last Name *
        </label>
        <input
          id="last_name"
          name="last_name"
          type="text"
          value={formData.last_name}
          onChange={handleChange}
          required
          minLength={1}
          className="border p-2 w-full"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="block mb-2">
          Email Address *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="border p-2 w-full"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="phone" className="block mb-2">
          Phone Number (10 digits)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          pattern="[0-9]{10}"
          placeholder="5551234567"
          className="border p-2 w-full"
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full mb-4">
        {isLoading ? 'Creating Account...' : 'Create Buyer Account'}
      </Button>

      <p className="text-sm">
        Already have an account?{' '}
        <Link href="/auth/login" className="underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}