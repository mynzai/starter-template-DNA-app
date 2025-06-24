export function Features() {
  return (
    <section className="py-24 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Powerful AI Features
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Everything you need to integrate AI into your workflow
          </p>
        </div>
        
        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="relative p-6 bg-gray-50 rounded-lg dark:bg-gray-800">
              <div className="w-12 h-12 bg-blue-500 rounded-lg mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const features = [
  {
    title: 'AI Chat Interface',
    description: 'Interactive chat with multiple AI models including OpenAI and Anthropic.',
  },
  {
    title: 'Real-time Streaming',
    description: 'Stream AI responses in real-time for better user experience.',
  },
  {
    title: 'Usage Analytics',
    description: 'Track usage, costs, and performance across all AI interactions.',
  },
  {
    title: 'User Management',
    description: 'Complete authentication and user management system.',
  },
  {
    title: 'Subscription Billing',
    description: 'Integrated Stripe billing for subscription management.',
  },
  {
    title: 'API Integration',
    description: 'RESTful APIs for integrating AI capabilities into your apps.',
  },
]