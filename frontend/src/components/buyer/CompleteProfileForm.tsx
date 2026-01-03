'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import apiClient from '@/lib/api/client'

export default function CompleteProfileForm() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Redirect if not authenticated or wrong role
    if (!user) {
      router.push('/auth/login')
      return
    }

    if (user.role !== 'buyer') {
      router.push('/auth/login')
      return
    }

    // Redirect if profile already completed
    if (user.account_data) {
      router.push('/buyer/profile')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await apiClient.post('/buyer/complete-profile', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || undefined // Send undefined if empty
      })

      if (response.data.success) {
        await refreshUser()
        router.push('/buyer/profile')
      } else {
        setError(response.data.error || 'Failed to complete profile')
      }
      
    } catch (err: any) {
      console.error('Complete profile error:', err)
      setError(err.response?.data?.error || err.message || 'Failed to complete profile')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="max-w-md border p-6">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md border p-6">
      <h2 className="text-2xl mb-6">Complete Your Profile</h2>

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
          value={user.email}
          disabled
          className="w-full border p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
        />
        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
      </div>

      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          First Name *
        </label>
        <input
          type="text"
          value={formData.first_name}
          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          required
          className="w-full border p-2"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          Last Name *
        </label>
        <input
          type="text"
          value={formData.last_name}
          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          required
          className="w-full border p-2"
        />
      </div>

      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium">
          Phone Number (Optional)
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full border p-2"
          placeholder="(555) 123-4567"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full border p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Saving...' : 'Complete Profile'}
      </button>
    </form>
  )
}