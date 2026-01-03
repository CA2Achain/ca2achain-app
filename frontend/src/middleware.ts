import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Middleware is minimal since we use localStorage JWT
  // Protected routes are handled by AuthContext on client side
  
  // Redirect old routes to new ones
  const path = request.nextUrl.pathname
  
  if (path === '/buyer/register') {
    return NextResponse.redirect(new URL('/auth/register', request.url))
  }
  
  if (path === '/dealer/register') {
    return NextResponse.redirect(new URL('/auth/register', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/buyer/register',
    '/dealer/register',
  ]
}