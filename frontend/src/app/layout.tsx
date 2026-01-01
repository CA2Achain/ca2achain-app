import type { Metadata } from 'next'
import '@/styles/globals.css'
import Header from '@/components/layout/Header'

export const metadata: Metadata = {
  title: 'CA2AChain',
  description: 'Identity verification for AB1263 compliance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  )
}