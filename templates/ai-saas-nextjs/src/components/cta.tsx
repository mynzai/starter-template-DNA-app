import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRightIcon } from 'lucide-react'

export function CTA() {
  return (
    <section className="py-24 bg-blue-600">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to Transform Your Business?
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Join thousands of companies already using our AI platform
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="group">
              <Link href="/auth/signup">
                Start Your Free Trial
                <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
              <Link href="/contact">
                Talk to Sales
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-blue-200">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}