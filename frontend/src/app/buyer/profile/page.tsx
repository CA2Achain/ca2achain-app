'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function BuyerProfilePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
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
        return
      }
    }
  }, [user, isLoading, router])

  if (isLoading || !user || !user.account_data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    )
  }

  const profile = user.account_data

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">Buyer Profile</h1>
      
      <div className="border p-6 max-w-2xl mb-6">
        <h2 className="text-xl mb-4">Account Information</h2>
        
        <div className="space-y-3">
          <div>
            <span className="font-bold">Name:</span> {profile.first_name} {profile.last_name}
          </div>
          <div>
            <span className="font-bold">Email:</span> {user.email}
          </div>
          {profile.phone && (
            <div>
              <span className="font-bold">Phone:</span> {profile.phone}
            </div>
          )}
          <div>
            <span className="font-bold">Verification Status:</span> {profile.verification_status}
          </div>
        </div>
      </div>

      <div className="border p-6 max-w-2xl">
        <h2 className="text-xl mb-4">Next Steps</h2>
        
        {profile.verification_status === 'pending' && (
          <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 mb-4">
            <p className="font-bold mb-2">Identity Verification Required</p>
            <p className="mb-3">Complete identity verification to activate your account.</p>
            <button 
              onClick={() => router.push('/buyer/verify-identity')}
              className="border px-4 py-2 hover:bg-gray-100"
            >
              Verify Identity
            </button>
          </div>
        )}

        {profile.verification_status === 'verified' && (
          <div className="p-4 border-l-4 border-green-500 bg-green-50">
            <p className="font-bold mb-2">Account Active</p>
            <p>Your identity is verified. Dealers can now verify your age and address.</p>
          </div>
        )}
      </div>
    </div>
  )
}