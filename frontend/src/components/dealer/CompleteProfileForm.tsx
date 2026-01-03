'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import apiClient from '@/lib/api/client'

export default function CompleteProfileForm() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const [formData, setFormData] = useState({
    company_name: '',
    business_phone: '',
    business_address: {
      street: '',
      city: '',
      state: '',
      zip_code: ''
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    if (user.role !== 'dealer') {
      router.push('/auth/login')
      return
    }

    if (user.account_data) {
      router.push('/dealer/profile')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await apiClient.post('/dealer/complete-profile', {
        company_name: formData.company_name,
        business_phone: formData.business_phone,
        business_address: formData.business_address
      })

      if (response.data.success) {
        await refreshUser()
        router.push('/dealer/profile')
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
    return <div className="max-w-2xl border p-6"><p>Loading...</p></div>
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl border p-6">
      <h2 className="text-2xl mb-6">Complete Your Profile</h2>

      {error && (
        <div className="mb-4 p-3 border border-red-500 text-red-500">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          Business Email
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
          Company Name *
        </label>
        <input
          type="text"
          value={formData.company_name}
          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
          required
          className="w-full border p-2"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          Business Phone *
        </label>
        <input
          type="tel"
          value={formData.business_phone}
          onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
          required
          pattern="[0-9]{10}"
          placeholder="5551234567"
          className="w-full border p-2"
        />
        <p className="text-xs text-gray-500 mt-1">10 digits, no spaces or dashes</p>
      </div>

      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          Street Address *
        </label>
        <input
          type="text"
          value={formData.business_address.street}
          onChange={(e) => setFormData({ 
            ...formData, 
            business_address: { ...formData.business_address, street: e.target.value }
          })}
          required
          className="w-full border p-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block mb-2 text-sm font-medium">City *</label>
          <input
            type="text"
            value={formData.business_address.city}
            onChange={(e) => setFormData({ 
              ...formData, 
              business_address: { ...formData.business_address, city: e.target.value }
            })}
            required
            className="w-full border p-2"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium">State *</label>
          <input
            type="text"
            value={formData.business_address.state}
            onChange={(e) => setFormData({ 
              ...formData, 
              business_address: { ...formData.business_address, state: e.target.value }
            })}
            required
            maxLength={2}
            placeholder="CA"
            className="w-full border p-2"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium">ZIP Code *</label>
        <input
          type="text"
          value={formData.business_address.zip_code}
          onChange={(e) => setFormData({ 
            ...formData, 
            business_address: { ...formData.business_address, zip_code: e.target.value }
          })}
          required
          pattern="[0-9]{5}"
          placeholder="90210"
          className="w-full border p-2"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full border p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Saving...' : 'Complete Profile'}
      </button>

      <p className="text-sm text-gray-600 mt-4">
        After completing your profile, you can set up your subscription and get your API key.
      </p>
    </form>
  )
}