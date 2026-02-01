'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function BuyerSettingsPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    if (user.role !== 'buyer') {
      router.push('/auth/login')
      return
    }

    if (!user.account_data) {
      router.push('/buyer/complete-profile')
    }
  }, [user, router])

  if (!user || !user.account_data) {
    return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">Settings</h1>

      <div className="border p-6 mb-6">
        <h2 className="text-xl mb-4">Account Information</h2>
        <div className="space-y-2">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> Buyer</p>
        </div>
      </div>

      <div className="border p-6 mb-6">
        <h2 className="text-xl mb-4">Privacy Settings</h2>
        <p className="text-gray-600">Manage your CCPA data rights and privacy preferences.</p>
        <button className="mt-4 border px-4 py-2 hover:bg-gray-100">
          Request Data Export
        </button>
      </div>

      <div className="border p-6 border-red-500">
        <h2 className="text-xl mb-4 text-red-600">Danger Zone</h2>
        <p className="text-gray-600 mb-4">Delete your account and all associated data.</p>
        <button className="border border-red-500 text-red-500 px-4 py-2 hover:bg-red-50">
          Delete Account
        </button>
      </div>
    </div>
  )
}