'use client'

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useRouter, usePathname } from 'next/navigation'

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (isAuthenticated && user) {
      // Already authenticated - redirect to their profile
      if (user.role === 'buyer') {
        router.push(user.account_data ? '/buyer/profile' : '/buyer/complete-profile')
      } else if (user.role === 'dealer') {
        router.push(user.account_data ? '/dealer/profile' : '/dealer/complete-profile')
      }
    } else {
      // Not authenticated - go to login
      router.push('/auth/login')
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  // Buyer navigation
  const buyerNav = (
    <>
      <Link href="/buyer/profile" className="hover:underline">
        Profile
      </Link>
      <Link href="/buyer/verify-identity" className="hover:underline">
        Verify Identity
      </Link>
      <Link href="/buyer/settings" className="hover:underline">
        Settings
      </Link>
      <button onClick={handleLogout} className="hover:underline">
        Logout
      </button>
    </>
  )

  // Dealer navigation
  const dealerNav = (
    <>
      <Link href="/dealer/profile" className="hover:underline">
        Profile
      </Link>
      <Link href="/dealer/verifications" className="hover:underline">
        Verifications
      </Link>
      <Link href="/dealer/billing" className="hover:underline">
        Billing
      </Link>
      <Link href="/dealer/settings" className="hover:underline">
        Settings
      </Link>
      <button onClick={handleLogout} className="hover:underline">
        Logout
      </button>
    </>
  )

  // Public navigation
  const publicNav = (
    <>
      <Link href="/about" className="hover:underline">
        About
      </Link>
      <Link href="/how-it-works" className="hover:underline">
        How It Works
      </Link>
      <Link href="/pricing" className="hover:underline">
        Pricing
      </Link>
      <a href="#" onClick={handleLoginClick} className="hover:underline">
        {isAuthenticated ? 'My Account' : 'Login'}
      </a>
    </>
  )

  // Determine which navigation to show
  const getNavigation = () => {
    if (!isAuthenticated || !user) {
      return publicNav
    }

    // If on public pages (/, /about, etc), show public nav
    if (pathname === '/' || pathname.startsWith('/about') || pathname.startsWith('/how-it-works') || pathname.startsWith('/pricing')) {
      return publicNav
    }

    // If on buyer/dealer pages, show role-specific nav
    if (user.role === 'buyer') {
      return buyerNav
    } else if (user.role === 'dealer') {
      return dealerNav
    }

    return publicNav
  }

  return (
    <header className="border-b">
      <nav className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          CA2AChain
        </Link>
        <div className="flex gap-6 items-center">
          {getNavigation()}
        </div>
      </nav>
    </header>
  )
}