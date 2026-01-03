'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function DealerVerificationsPage() {
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

  const dealer = user.account_data
  const hasSubscription = dealer.subscription_status !== null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">Verifications</h1>

      {!hasSubscription ? (
        <div className="border p-6 bg-yellow-50">
          <h2 className="text-xl mb-4">Subscription Required</h2>
          <p className="text-gray-600 mb-4">
            You need an active subscription to perform verifications.
          </p>
          <button 
            onClick={() => router.push('/dealer/billing')}
            className="border px-4 py-2 hover:bg-gray-100"
          >
            Set Up Subscription
          </button>
        </div>
      ) : (
        <>
          <div className="border p-6 mb-6">
            <h2 className="text-xl mb-4">API Integration</h2>
            <p className="text-gray-600 mb-4">
              Use your API key to integrate verification into your system.
            </p>
            <div className="bg-gray-100 p-3 rounded font-mono text-sm">
              API Key: {dealer.api_key_hash ? 'ca2a_****' : 'Not generated'}
            </div>
            <button className="mt-4 border px-4 py-2 hover:bg-gray-100">
              View API Documentation
            </button>
          </div>

          <div className="border p-6">
            <h2 className="text-xl mb-4">Recent Verifications</h2>
            <p className="text-gray-600">
              Your verification history will appear here.
            </p>
          </div>
        </>
      )}
    </div>
  )
}