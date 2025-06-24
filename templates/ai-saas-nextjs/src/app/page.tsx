import { Metadata } from 'next'
import { Hero } from '@/components/hero'
import { Features } from '@/components/features'
import { Pricing } from '@/components/pricing'
import { CTA } from '@/components/cta'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Welcome to the AI SaaS Platform - Transform your business with AI-powered tools',
}

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <Hero />
      
      {/* Features Section */}
      <Features />
      
      {/* Pricing Section */}
      <Pricing />
      
      {/* Call to Action */}
      <CTA />
    </div>
  )
}