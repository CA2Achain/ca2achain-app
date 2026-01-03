'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()
  
  // Only show footer on public pages
  const isPublicPage = pathname === '/' || 
                       pathname?.startsWith('/public/')

  if (!isPublicPage) {
    return null
  }

  return (
    <footer className="border-t mt-8">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              © 2026 CA2AChain. All rights reserved.
            </p>
          </div>
          <div className="flex gap-6">
            <Link href="/public/privacy" className="text-sm text-gray-600 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/public/terms" className="text-sm text-gray-600 hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}