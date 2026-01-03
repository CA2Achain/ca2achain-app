'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function DealerBillingPage() {
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
      <h1 className="text-3xl mb-8">Billing & Subscription</h1>

      {!hasSubscription ? (
        <div className="border p-6 mb-6 bg-yellow-50">
          <h2 className="text-xl mb-4">No Active Subscription</h2>
          <p className="text-gray-600 mb-4">
            Set up your subscription to start using the verification API.
          </p>
          <button className="border px-4 py-2 hover:bg-gray-100">
            Set Up Subscription
          </button>
        </div>
      ) : (
        <>
          <div className="border p-6 mb-6">
            <h2 className="text-xl mb-4">Current Subscription</h2>
            <div className="space-y-2">
              <p><strong>Tier:</strong> {dealer.subscription_tier}</p>
              <p><strong>Status:</strong> {dealer.subscription_status}</p>
              <p><strong>Credits Available:</strong> {
                (dealer.credits_purchased || 0) + (dealer.additional_credits_purchased || 0) - (dealer.credits_used || 0)
              }</p>
            </div>
          </div>

          <div className="border p-6 mb-6">
            <h2 className="text-xl mb-4">Usage This Month</h2>
            <p><strong>Credits Used:</strong> {dealer.credits_used || 0}</p>
          </div>

          <div className="border p-6 mb-6">
            <h2 className="text-xl mb-4">Purchase Additional Credits</h2>
            <p className="text-gray-600 mb-4">
              Buy extra verification credits beyond your monthly allocation.
            </p>
            <button className="border px-4 py-2 hover:bg-gray-100">
              Purchase Credits
            </button>
          </div>
        </>
      )}

      <div className="border p-6">
        <h2 className="text-xl mb-4">Payment Method</h2>
        <p className="text-gray-600">
          {hasSubscription ? 'Update your payment method' : 'Add a payment method to activate your subscription'}
        </p>
        <button className="mt-4 border px-4 py-2 hover:bg-gray-100">
          {hasSubscription ? 'Update Payment Method' : 'Add Payment Method'}
        </button>
      </div>
    </div>
  )
}