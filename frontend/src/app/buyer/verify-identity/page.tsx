'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api/client'

export default function BuyerVerifyIdentityPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await apiClient.get('/buyer/profile')
        if (response.data.success) {
          const buyerProfile = response.data.data
          setProfile(buyerProfile)
          
          // If already verified, redirect to profile
          if (buyerProfile.verification_status === 'verified') {
            router.push('/buyer/profile')
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
      } finally {
        setIsLoading(false)
      }
    }
    checkStatus()
  }, [router])

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">Verify Your Identity</h1>
      
      <div className="border p-6 max-w-2xl">
        <h2 className="text-xl mb-4">Registration Complete!</h2>
        <p className="mb-4">
          Welcome {profile?.first_name}! Your account has been created successfully. 
        </p>
        <p className="mb-4">
          Next step: Identity verification via Persona (coming soon)
        </p>
        
        <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
          <p className="font-bold mb-2">What happens next:</p>
          <ol className="list-decimal ml-6 space-y-2">
            <li>Complete identity verification (Persona integration)</li>
            <li>Make one-time payment ($39)</li>
            <li>Your account will be ready for age/address verification</li>
          </ol>
        </div>

        <div className="mt-6">
          <button
            onClick={() => router.push('/buyer/profile')}
            className="border px-4 py-2 hover:bg-gray-100"
          >
            Go to Profile
          </button>
        </div>
      </div>
    </div>
  )
}