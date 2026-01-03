'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">Verify Your Identity</h1>

      <div className="border p-6 mb-6">
        <h2 className="text-xl mb-4">Identity Verification Status</h2>
        <div className="mb-4">
          <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded">
            Pending Verification
          </span>
        </div>
        <p className="text-gray-600">
          Complete identity verification to enable age and address verification for dealers.
        </p>
      </div>

      <div className="border p-6 mb-6">
        <h2 className="text-xl mb-4">Step 1: Persona Identity Verification</h2>
        <p className="text-gray-600 mb-4">
          Verify your identity securely using Persona. We'll verify your driver's license.
        </p>
        <button className="border px-4 py-2 hover:bg-gray-100">
          Start Persona Verification
        </button>
      </div>

      <div className="border p-6 bg-gray-50">
        <h2 className="text-xl mb-4">Step 2: Polygon ID Credential</h2>
        <p className="text-gray-600">
          After Persona verification, you'll receive a Polygon ID credential for privacy-preserving verification.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This step will be available after completing Persona verification.
        </p>
      </div>
    </div>
  )
}