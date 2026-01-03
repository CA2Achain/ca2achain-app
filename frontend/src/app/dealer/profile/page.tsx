'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function DealerProfilePage() {
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">Dealer Profile</h1>

      <div className="border p-6 mb-6">
        <h2 className="text-xl mb-4">Business Information</h2>
        <div className="space-y-2">
          <p><strong>Company Name:</strong> {dealer.company_name}</p>
          <p><strong>Business Email:</strong> {dealer.business_email || user.email}</p>
          <p><strong>Business Phone:</strong> {dealer.business_phone}</p>
          <p><strong>Dealer Reference ID:</strong> {dealer.dealer_reference_id}</p>
        </div>
      </div>

      {dealer.business_address && (
        <div className="border p-6 mb-6">
          <h2 className="text-xl mb-4">Business Address</h2>
          <p>{dealer.business_address.street}</p>
          <p>{dealer.business_address.city}, {dealer.business_address.state} {dealer.business_address.zip_code}</p>
        </div>
      )}

      <div className="border p-6 mb-6">
        <h2 className="text-xl mb-4">Subscription Status</h2>
        {dealer.subscription_status ? (
          <div className="space-y-2">
            <p><strong>Status:</strong> {dealer.subscription_status}</p>
            <p><strong>Tier:</strong> {dealer.subscription_tier || 'Not set'}</p>
            <p><strong>Credits Available:</strong> {
              dealer.credits_purchased !== null 
                ? (dealer.credits_purchased + (dealer.additional_credits_purchased || 0) - (dealer.credits_used || 0))
                : 'No subscription'
            }</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">No active subscription</p>
            <button 
              onClick={() => router.push('/dealer/billing')}
              className="border px-4 py-2 hover:bg-gray-100"
            >
              Set Up Subscription
            </button>
          </div>
        )}
      </div>

      <div className="border p-6">
        <h2 className="text-xl mb-4">Quick Actions</h2>
        <div className="space-y-2">
          <button 
            onClick={() => router.push('/dealer/verifications')}
            className="w-full border p-2 hover:bg-gray-100"
          >
            View Verifications
          </button>
          <button 
            onClick={() => router.push('/dealer/billing')}
            className="w-full border p-2 hover:bg-gray-100"
          >
            Manage Billing
          </button>
          <button 
            onClick={() => router.push('/dealer/settings')}
            className="w-full border p-2 hover:bg-gray-100"
          >
            Account Settings
          </button>
        </div>
      </div>
    </div>
  )
}