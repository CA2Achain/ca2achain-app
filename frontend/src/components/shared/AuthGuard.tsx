'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: ('buyer' | 'dealer' | 'admin')[]
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter()

  useEffect(() => {
    // TODO: Check if user is authenticated
    // TODO: Check if user has required role
    // TODO: Redirect to login if not authenticated
    // TODO: Redirect to unauthorized page if wrong role
  }, [allowedRoles, router])

  return <>{children}</>
}
