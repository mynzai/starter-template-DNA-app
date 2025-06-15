import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRightIcon } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative overflow-hidden gradient-bg py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl dark:text-white">
            Transform Your Business with{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Power
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300">
            Harness the power of artificial intelligence to automate workflows, 
            generate insights, and accelerate your business growth with our comprehensive SaaS platform.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button asChild size="lg" className="group">
              <Link href="/auth/signup">
                Start Free Trial
                <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/demo">
                Watch Demo
              </Link>
            </Button>
          </div>
          <div className="mt-16 flow-root sm:mt-24">
            <div className="glass-effect -m-2 rounded-xl lg:-m-4 lg:rounded-2xl lg:p-4">
              <div className="aspect-video rounded-md bg-gradient-to-br from-blue-50 to-purple-50 p-8 dark:from-gray-800 dark:to-gray-900">
                <div className="h-full w-full rounded-lg bg-white/50 backdrop-blur-sm dark:bg-gray-800/50">
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                        Interactive Demo Coming Soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-600 to-purple-600 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>
    </section>
  )
}