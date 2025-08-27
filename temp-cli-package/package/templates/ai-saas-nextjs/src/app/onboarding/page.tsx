'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [userData, setUserData] = useState({
    role: '',
    company: '',
    useCase: '',
    experience: '',
    goals: []
  })

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1)
    }
  }

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      // Save user preferences to database
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        router.push('/dashboard')
      } else {
        console.error('Failed to save onboarding data')
      }
    } catch (error) {
      console.error('Error saving onboarding data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">What's your role?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['Business Owner', 'Marketing Manager', 'Developer', 'Designer', 'Content Creator', 'Other'].map((role) => (
                <button
                  key={role}
                  onClick={() => setUserData({ ...userData, role })}
                  className={`p-4 border rounded-lg text-left hover:border-blue-500 transition-colors ${
                    userData.role === role ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium">{role}</div>
                </button>
              ))}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">Company Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name (Optional)
                </label>
                <input
                  type="text"
                  id="company"
                  value={userData.company}
                  onChange={(e) => setUserData({ ...userData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your company name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {['Just me', '2-10 employees', '11-50 employees', '51-200 employees', '200+ employees'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setUserData({ ...userData, useCase: size })}
                      className={`p-3 border rounded-lg text-left hover:border-blue-500 transition-colors ${
                        userData.useCase === size ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">AI Experience Level</h2>
            <div className="space-y-4">
              {[
                { level: 'Beginner', desc: 'New to AI tools and looking to get started' },
                { level: 'Intermediate', desc: 'Some experience with AI tools like ChatGPT' },
                { level: 'Advanced', desc: 'Regular user of multiple AI platforms' },
                { level: 'Expert', desc: 'Building or implementing AI solutions' }
              ].map(({ level, desc }) => (
                <button
                  key={level}
                  onClick={() => setUserData({ ...userData, experience: level })}
                  className={`w-full p-4 border rounded-lg text-left hover:border-blue-500 transition-colors ${
                    userData.experience === level ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium">{level}</div>
                  <div className="text-sm text-gray-600">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">What are your main goals?</h2>
            <p className="text-center text-gray-600">Select all that apply</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                'Automate repetitive tasks',
                'Generate content faster',
                'Improve customer service',
                'Analyze data insights',
                'Create marketing materials',
                'Build AI-powered products',
                'Research and learning',
                'Other'
              ].map((goal) => (
                <button
                  key={goal}
                  onClick={() => {
                    const goals = userData.goals.includes(goal)
                      ? userData.goals.filter(g => g !== goal)
                      : [...userData.goals, goal]
                    setUserData({ ...userData, goals })
                  }}
                  className={`p-4 border rounded-lg text-left hover:border-blue-500 transition-colors ${
                    userData.goals.includes(goal) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 border-2 rounded mr-3 ${
                      userData.goals.includes(goal) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}>
                      {userData.goals.includes(goal) && (
                        <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium">{goal}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Step {step} of 4</span>
            <span>{Math.round((step / 4) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Welcome Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {session?.user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600">
            Let's personalize your AI experience in just a few quick steps
          </p>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            onClick={handlePrevious}
            disabled={step === 1}
            variant="outline"
            className="px-6"
          >
            Previous
          </Button>

          {step < 4 ? (
            <Button
              onClick={handleNext}
              disabled={!userData.role && step === 1}
              className="px-6"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={isLoading || userData.goals.length === 0}
              className="px-6"
            >
              {isLoading ? 'Setting up...' : 'Complete Setup'}
            </Button>
          )}
        </div>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}