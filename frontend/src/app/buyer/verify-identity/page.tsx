'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function BuyerVerifyIdentityPage() {
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

  const verificationStatus = user.account_data.verification_status || 'pending'
  const paymentStatus = user.account_data.payment_status || 'pending'
  const verifiedAt = user.account_data.verified_at
  const verificationExpiresAt = user.account_data.verification_expires_at

  // Format dates for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not yet verified'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">Verify Your Identity</h1>

      <div className="border rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Verification Status</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="border-l-4 border-blue-400 pl-4">
            <p className="text-sm text-gray-600">Verification Status</p>
            <p className="text-lg font-medium capitalize">{verificationStatus}</p>
          </div>
          
          <div className="border-l-4 border-green-400 pl-4">
            <p className="text-sm text-gray-600">Payment Status</p>
            <p className="text-lg font-medium capitalize">{paymentStatus}</p>
          </div>
          
          <div className="border-l-4 border-purple-400 pl-4">
            <p className="text-sm text-gray-600">Verified At</p>
            <p className="text-lg font-medium">{formatDate(verifiedAt)}</p>
          </div>
          
          <div className="border-l-4 border-orange-400 pl-4">
            <p className="text-sm text-gray-600">Expires At</p>
            <p className="text-lg font-medium">{formatDate(verificationExpiresAt)}</p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Start New CA DMV Identification Verification</h2>
        <p className="text-gray-600 mb-6">
          Complete identity verification to enable age and address verification for dealers.
          Verification requires a valid driver's license and is valid until the ID expiration date.
        </p>
        
        <Link href="/buyer/verify-identity/start">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            Start Verification
          </button>
        </Link>
      </div>
    </div>
  )
}