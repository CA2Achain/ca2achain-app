'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import './globals.css'

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    // Don't redirect while loading or on auth pages
    if (isLoading) return
    if (pathname?.startsWith('/auth/')) return
    if (pathname === '/') return

    // Only redirect authenticated users
    if (user) {
      // Check if they need to complete profile
      if (user.role === 'buyer' && !user.account_data) {
        if (pathname !== '/buyer/complete-profile') {
          router.push('/buyer/complete-profile')
        }
      } else if (user.role === 'dealer' && !user.account_data) {
        if (pathname !== '/dealer/complete-profile') {
          router.push('/dealer/complete-profile')
        }
      }
    }
  }, [user, isLoading, pathname, router])

  return <>{children}</>
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AuthRedirect>
            <Header />
            <main>{children}</main>
            <Footer />
          </AuthRedirect>
        </AuthProvider>
      </body>
    </html>
  )
}