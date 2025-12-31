'use client'

import Link from 'next/link'

export default function Header() {
  // TODO: Add auth state detection to show/hide role-specific nav
  // TODO: Get current user role (buyer/dealer/admin)
  
  return (
    <header>
      {/* Main navigation - always visible */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="font-bold text-xl">
              CA2AChain
            </Link>
            <div className="flex gap-6">
              <Link href="/public/about">About</Link>
              <Link href="/public/how-it-works">How It Works</Link>
              <Link href="/public/pricing">Pricing</Link>
              <Link href="/auth/login">Login</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Role-specific navigation - shows when authenticated */}
      {/* TODO: Conditionally render based on user role */}
    </header>
  )
}
