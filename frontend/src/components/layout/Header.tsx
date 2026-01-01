'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { ROUTES } from '@/lib/constants/routes'

export default function Header() {
  const { isAuthenticated, role } = useAuth()
  
  return (
    <header>
      {/* Main navigation - always visible */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <Link href={ROUTES.HOME}>CA2AChain</Link>
            
            {!isAuthenticated && (
              <div className="flex gap-6">
                <Link href={ROUTES.ABOUT}>About</Link>
                <Link href={ROUTES.HOW_IT_WORKS}>How It Works</Link>
                <Link href={ROUTES.PRICING}>Pricing</Link>
                <Link href={ROUTES.LOGIN}>Login</Link>
              </div>
            )}
            
            {isAuthenticated && (
              <div className="flex gap-6">
                <Link href={ROUTES.ABOUT}>About</Link>
                <button onClick={() => {/* TODO: logout */}}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Role-specific sub-navigation */}
      {isAuthenticated && role === 'buyer' && (
        <nav className="border-b bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-6 h-12 items-center">
              <Link href={ROUTES.BUYER_PROFILE}>Profile</Link>
              <Link href={ROUTES.BUYER_VERIFY_IDENTITY}>Verify Identity</Link>
              <Link href={ROUTES.BUYER_SETTINGS}>Settings</Link>
            </div>
          </div>
        </nav>
      )}

      {isAuthenticated && role === 'dealer' && (
        <nav className="border-b bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-6 h-12 items-center">
              <Link href={ROUTES.DEALER_PROFILE}>Profile</Link>
              <Link href={ROUTES.DEALER_VERIFICATIONS}>Verifications</Link>
              <Link href={ROUTES.DEALER_BILLING}>Billing</Link>
              <Link href={ROUTES.DEALER_SETTINGS}>Settings</Link>
            </div>
          </div>
        </nav>
      )}

      {isAuthenticated && role === 'admin' && (
        <nav className="border-b bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-6 h-12 items-center">
              <Link href={ROUTES.ADMIN_DASHBOARD}>Dashboard</Link>
              <Link href={ROUTES.ADMIN_COMPLIANCE}>Compliance Events</Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}