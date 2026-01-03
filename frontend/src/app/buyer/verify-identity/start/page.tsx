'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function BuyerVerifyIdentityStartPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState<'payment' | 'persona'>('payment')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Payment form state
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [billingName, setBillingName] = useState('')

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

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // TODO: Call backend /payments/checkout endpoint
      // For now, just move to next step
      console.log('Payment submitted:', {
        cardNumber: cardNumber.slice(-4),
        billingName
      })
      
      // In mock mode, proceed to Persona step
      setStep('persona')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const handleStartPersona = async () => {
    setError('')
    setLoading(true)

    try {
      // Get token from localStorage
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      // Call backend to create Persona inquiry
      const response = await fetch('/api/persona/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to create verification inquiry')
      }

      const data = await response.json()
      
      if (data.success && data.data?.hosted_url) {
        // Redirect to Persona hosted verification
        window.location.href = data.data.hosted_url
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Persona verification')
    } finally {
      setLoading(false)
    }
  }

  if (!user || !user.account_data) {
    return <div className="max-w-2xl mx-auto px-4 py-8">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-2">Identity Verification</h1>
      <p className="text-gray-600 mb-8">Complete the steps below to verify your identity</p>

      {/* Step Indicator */}
      <div className="flex gap-4 mb-8">
        <div className={`flex-1 p-4 rounded-lg border-2 ${step === 'payment' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
          <p className="font-semibold">Step 1: Payment</p>
          <p className="text-sm text-gray-600">$2.00 verification fee</p>
        </div>
        <div className={`flex-1 p-4 rounded-lg border-2 ${step === 'persona' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
          <p className="font-semibold">Step 2: Identity Verification</p>
          <p className="text-sm text-gray-600">Verify via Persona</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Payment Step */}
      {step === 'payment' && (
        <div className="border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
          <p className="text-gray-600 mb-6">
            Enter your credit card to pay the $2.00 verification fee. Your card information is processed securely by Stripe.
          </p>

          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cardholder Name</label>
              <input
                type="text"
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Card Number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, '').slice(0, 16))}
                placeholder="4242 4242 4242 4242"
                maxLength={19}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">For testing: 4242 4242 4242 4242</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Expiry (MM/YY)</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="12/25"
                  maxLength={5}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">CVC</label>
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.slice(0, 4))}
                  placeholder="123"
                  maxLength={4}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'Processing...' : 'Continue to Identity Verification'}
            </button>
          </form>
        </div>
      )}

      {/* Persona Step */}
      {step === 'persona' && (
        <div className="border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Identity Verification</h2>
          <p className="text-gray-600 mb-6">
            You're now ready to verify your identity using Persona. We'll securely verify your driver's license and confirm your identity.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              ✓ Payment completed<br/>
              You'll be redirected to a secure verification page
            </p>
          </div>

          <button
            onClick={handleStartPersona}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Starting Verification...' : 'Start Identity Verification'}
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h3 className="font-semibold mb-2">What We Verify</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✓ Valid driver's license</li>
          <li>✓ Age (18+)</li>
          <li>✓ Identity match (selfie)</li>
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          Your information is encrypted and used only for verification purposes.
        </p>
      </div>
    </div>
  )
}