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
      if (user.role === 'buyer') {
        router.push(user.account_data ? '/buyer/profile' : '/buyer/complete-profile')
      } else if (user.role === 'dealer') {
        router.push(user.account_data ? '/dealer/profile' : '/dealer/complete-profile')
      }
    } else {
      router.push('/auth/login')
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

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

  const publicNav = (
    <>
      <Link href="/public/about" className="hover:underline">
        About
      </Link>
      <Link href="/public/how-it-works" className="hover:underline">
        How It Works
      </Link>
      <Link href="/public/pricing" className="hover:underline">
        Pricing
      </Link>
      <a href="#" onClick={handleLoginClick} className="hover:underline">
        {isAuthenticated ? 'My Account' : 'Login'}
      </a>
    </>
  )

  const getNavigation = () => {
    if (!isAuthenticated || !user) {
      return publicNav
    }

    if (pathname === '/' || pathname?.startsWith('/public/')) {
      return publicNav
    }

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