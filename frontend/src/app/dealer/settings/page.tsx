'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function DealerSettingsPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    if (user.role !== 'dealer') {
      router.push('/auth/login')
      return
    }

    if (!user.account_data) {
      router.push('/dealer/complete-profile')
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
          <p><strong>Business Email:</strong> {user.email}</p>
          <p><strong>Company:</strong> {user.account_data.company_name}</p>
          <p><strong>Role:</strong> Dealer</p>
          <p><strong>Account Status:</strong> Active</p>
        </div>
      </div>

      <div className="border p-6 mb-6">
        <h2 className="text-xl mb-4">API Settings</h2>
        <p className="text-gray-600 mb-4">Manage your API keys and integration settings.</p>
        <button className="border px-4 py-2 hover:bg-gray-100">
          Regenerate API Key
        </button>
      </div>

      <div className="border p-6 mb-6">
        <h2 className="text-xl mb-4">Notification Preferences</h2>
        <p className="text-gray-600">Configure email notifications for verifications and billing.</p>
      </div>

      <div className="border p-6 border-red-500">
        <h2 className="text-xl mb-4 text-red-600">Danger Zone</h2>
        <p className="text-gray-600 mb-4">Cancel subscription and delete your account.</p>
        <button className="border border-red-500 text-red-500 px-4 py-2 hover:bg-red-50">
          Delete Account
        </button>
      </div>
    </div>
  )
}