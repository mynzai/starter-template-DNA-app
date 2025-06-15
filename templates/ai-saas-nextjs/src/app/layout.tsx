import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { cn } from '@/lib/utils'
import { Providers } from '@/components/providers'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'AI SaaS Platform',
    template: '%s | AI SaaS Platform',
  },
  description: 'AI-powered SaaS platform built with Next.js 14+, TypeScript, and Tailwind CSS',
  keywords: [
    'AI',
    'SaaS',
    'Next.js',
    'TypeScript',
    'Tailwind CSS',
    'OpenAI',
    'Anthropic',
    'Machine Learning',
    'Artificial Intelligence',
  ],
  authors: [
    {
      name: 'AI SaaS Team',
    },
  ],
  creator: 'AI SaaS Platform',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    title: 'AI SaaS Platform',
    description: 'AI-powered SaaS platform built with Next.js 14+',
    siteName: 'AI SaaS Platform',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI SaaS Platform',
    description: 'AI-powered SaaS platform built with Next.js 14+',
    creator: '@aisaasplatform',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable,
          jetbrainsMono.variable
        )}
      >
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  )
}