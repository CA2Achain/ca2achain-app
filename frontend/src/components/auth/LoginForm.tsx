'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/button'

interface LoginFormProps {
  accountType: 'buyer' | 'dealer'
  registerLink: string
}

export default function LoginForm({ accountType, registerLink }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // TODO: Call API to send magic link
    console.log('Sending magic link to:', email, 'for', accountType)
    
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="border p-6 max-w-md">
      <h2 className="text-xl mb-4">
        {accountType === 'buyer' ? 'Buyer Sign In' : 'Dealer Sign In'}
      </h2>
      
      <div className="mb-4">
        <label htmlFor={`${accountType}-email`} className="block mb-2">
          Email Address
        </label>
        <input
          id={`${accountType}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border p-2 w-full"
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full mb-4">
        {isLoading ? 'Sending...' : 'Send One-Time Passcode'}
      </Button>

      <p className="text-sm">
        Don't have an account?{' '}
        <Link href={registerLink} className="underline">
          Register here
        </Link>
      </p>
    </form>
  )
}